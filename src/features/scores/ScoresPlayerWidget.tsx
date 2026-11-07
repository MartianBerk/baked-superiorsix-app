import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  fetchMatchDetail,
  getLiveScores,
  isNoRoundInProgressError,
  listGameSubrounds,
  listLiveMatches,
  type LiveMatch,
  type LiveScoreFixture,
  type LiveScorePlayer,
  type MatchDifficulty,
  type PredictionChoice,
  type Subround,
} from '@/api/superiorsix';
import { ApiError } from '@/api/errors';
import { matchesNow } from '@/features/matches/devClock';
import {
  discoveryDayKeys,
  toLegacyDateParam,
  utcDayKey,
} from '@/features/matches/formatMatchDate';
import { aggregateSelectionDifficulty } from '@/features/matches/matchDifficulty';
import {
  emptyLiveScoresBoard,
  isMatchesDevMockScoresActive,
  withDevMockLiveScores,
} from '@/features/matches/mockLiveScores';
import { SubroundScrubber } from '@/features/matches/SubroundScrubber';
import { colors } from '@/theme';

import { KickoffDateDisplay } from './KickoffDateDisplay';
import { LIVE_POLL_MS } from './liveScoreDisplay';
import { isPickCurrentlyCorrect } from './pickOutcome';
import { PlayerScoreSection } from './PlayerScoreSection';

type SlateMatch = LiveMatch & {
  difficulty?: MatchDifficulty | null;
};

type PlayerBoard = {
  authId: string;
  name: string;
  score: number;
  predictions: Record<number, PredictionChoice | null>;
};

function sortMatches(matches: SlateMatch[]): SlateMatch[] {
  return [...matches].sort((a, b) => {
    const aNum = a.game_number ?? 99;
    const bNum = b.game_number ?? 99;
    if (aNum !== bNum) {
      return aNum - bNum;
    }
    return a.match_date.localeCompare(b.match_date) || a.id - b.id;
  });
}

function groupBySubround(matches: SlateMatch[]): Record<number, SlateMatch[]> {
  const byId: Record<number, SlateMatch[]> = {};
  for (const match of matches) {
    const subroundId = match.subround_id;
    if (subroundId == null) {
      continue;
    }
    const bucket = byId[subroundId] ?? [];
    bucket.push(match);
    byId[subroundId] = bucket;
  }
  for (const key of Object.keys(byId)) {
    byId[Number(key)] = sortMatches(byId[Number(key)]);
  }
  return byId;
}

/** Prefer latest active slate with matches; else latest overall. */
function pickScoresSubround(
  list: Subround[],
  preferredId: number | null,
): Subround | null {
  const withMatches = list.filter((row) => row.match_count > 0);
  if (withMatches.length === 0) {
    return null;
  }
  if (preferredId != null) {
    const preferred = withMatches.find((row) => row.id === preferredId);
    if (preferred) {
      return preferred;
    }
  }
  const active = withMatches.filter((row) => !row.is_over);
  if (active.length > 0) {
    return active[active.length - 1];
  }
  return withMatches[withMatches.length - 1];
}

function boardsFromLiveScores(scores: LiveScorePlayer[]): PlayerBoard[] {
  return scores.map((player) => {
    const predictions: Record<number, PredictionChoice | null> = {};
    for (const row of player.matches) {
      predictions[row.match_id] = row.prediction;
    }
    return {
      authId: player.auth_id,
      name: player.name,
      // Placeholder — display score is recomputed from live slate + picks.
      score: player.score,
      predictions,
    };
  });
}

/** Correct picks for this player against the live/mock slate (0–6). */
function countCorrectPicks(
  predictions: Record<number, PredictionChoice | null>,
  slate: SlateMatch[],
  now: Date,
): number {
  let correct = 0;
  for (const match of slate) {
    if (isPickCurrentlyCorrect(predictions[match.id] ?? null, match, now)) {
      correct += 1;
    }
  }
  return correct;
}

function sortBoardsByCorrect(boards: PlayerBoard[]): PlayerBoard[] {
  return [...boards].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

function fixtureToSlateMatch(
  fixture: LiveScoreFixture,
  difficulty?: SlateMatch['difficulty'],
): SlateMatch {
  return {
    id: fixture.id,
    home_team: fixture.home_team,
    away_team: fixture.away_team,
    home_score: fixture.home_score,
    away_score: fixture.away_score,
    status: fixture.status,
    match_minute: fixture.match_minute,
    game_number: fixture.game_number,
    match_date: fixture.match_date,
    subround_id: fixture.subround_id,
    difficulty: difficulty ?? null,
  };
}

function mergeBoardFixtures(
  existing: SlateMatch[],
  boardMatches: LiveScoreFixture[],
): SlateMatch[] {
  if (boardMatches.length === 0) {
    return existing;
  }
  const difficultyById = new Map(
    existing.map((m) => [m.id, m.difficulty] as const),
  );
  return sortMatches(
    boardMatches.map((fixture) =>
      fixtureToSlateMatch(fixture, difficultyById.get(fixture.id) ?? null),
    ),
  );
}

/**
 * Player Scores: admin-predictions layout without H/D/A submit.
 * Players collapsed by default; expand shows read-only pick badges only.
 * Slate fixtures still merge `/game/livescores` (+ FE mock) so badges / n/6
 * correct counts stay in sync with Matches.
 */
export function ScoresPlayerWidget() {
  const [subrounds, setSubrounds] = useState<Subround[]>([]);
  const [matchesBySubround, setMatchesBySubround] = useState<
    Record<number, SlateMatch[]>
  >({});
  const matchesBySubroundRef = useRef<Record<number, SlateMatch[]>>({});
  const [selectedSubroundId, setSelectedSubroundId] = useState<number | null>(
    null,
  );
  const selectedSubroundIdRef = useRef<number | null>(null);

  const [boards, setBoards] = useState<PlayerBoard[]>([]);
  /** authId → expanded; default collapsed. */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boardLive, setBoardLive] = useState(false);
  const [now] = useState(() => matchesNow());

  useEffect(() => {
    selectedSubroundIdRef.current = selectedSubroundId;
  }, [selectedSubroundId]);

  useEffect(() => {
    matchesBySubroundRef.current = matchesBySubround;
  }, [matchesBySubround]);

  const selectedSubround = useMemo(
    () => subrounds.find((row) => row.id === selectedSubroundId) ?? null,
    [subrounds, selectedSubroundId],
  );

  const matches = useMemo(
    () =>
      selectedSubroundId != null
        ? (matchesBySubround[selectedSubroundId] ?? [])
        : [],
    [selectedSubroundId, matchesBySubround],
  );

  const slateDifficulty = useMemo(
    () => aggregateSelectionDifficulty(matches.map((m) => m.difficulty)),
    [matches],
  );

  /** Header n/6 is correct-picks count from live/mock slate, not raw API score. */
  const rankedBoards = useMemo(
    () =>
      sortBoardsByCorrect(
        boards.map((board) => ({
          ...board,
          score: countCorrectPicks(board.predictions, matches, now),
        })),
      ),
    [boards, matches, now],
  );

  const applyLiveBoard = useCallback(
    (subroundId: number, board: Awaited<ReturnType<typeof getLiveScores>>) => {
      setBoardLive(board.live);
      setBoards(boardsFromLiveScores(board.scores));
      setMatchesBySubround((prev) => {
        const merged = mergeBoardFixtures(prev[subroundId] ?? [], board.matches);
        const next = { ...prev, [subroundId]: merged };
        matchesBySubroundRef.current = next;
        return next;
      });
    },
    [],
  );

  const loadScores = useCallback(
    async (subroundId: number | null, opts?: { quiet?: boolean }) => {
      if (subroundId == null) {
        setBoards([]);
        setBoardLive(false);
        return;
      }
      if (!opts?.quiet) {
        setScoresLoading(true);
      }
      const fallback = matchesBySubroundRef.current[subroundId] ?? [];
      try {
        let board = await getLiveScores({ subroundId });
        if (isMatchesDevMockScoresActive()) {
          board = withDevMockLiveScores(board, fallback);
        }
        applyLiveBoard(subroundId, board);
      } catch (err) {
        if (isMatchesDevMockScoresActive()) {
          applyLiveBoard(
            subroundId,
            withDevMockLiveScores(emptyLiveScoresBoard(), fallback),
          );
          return;
        }
        if (err instanceof ApiError && err.status === 501) {
          setBoards([]);
          setBoardLive(false);
          return;
        }
        setError(
          err instanceof ApiError ? err.message : 'Could not load scores.',
        );
      } finally {
        if (!opts?.quiet) {
          setScoresLoading(false);
        }
      }
    },
    [applyLiveBoard],
  );

  const loadCatalog = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      try {
        let listed: Subround[] = [];
        let noRound = false;
        try {
          listed = await listGameSubrounds();
        } catch (err) {
          if (isNoRoundInProgressError(err)) {
            noRound = true;
          } else {
            throw err;
          }
        }

        const dayResults = await Promise.all(
          discoveryDayKeys().map((dayKey) =>
            listLiveMatches(toLegacyDateParam(dayKey)),
          ),
        );
        const byId = new Map<number, SlateMatch>();
        for (const dayMatches of dayResults) {
          for (const match of dayMatches) {
            byId.set(match.id, match);
          }
        }
        let all = [...byId.values()];
        const details = await Promise.all(
          all.map(async (match) => {
            try {
              const detail = await fetchMatchDetail({
                homeTeam: match.home_team,
                awayTeam: match.away_team,
                matchDate: toLegacyDateParam(utcDayKey(match.match_date)),
              });
              return { id: match.id, difficulty: detail.difficulty ?? null };
            } catch {
              return { id: match.id, difficulty: null };
            }
          }),
        );
        const difficultyById = new Map(
          details.map((row) => [row.id, row.difficulty]),
        );
        all = all.map((match) => ({
          ...match,
          difficulty: difficultyById.get(match.id) ?? null,
        }));

        const bySubround = groupBySubround(all);
        const navigable = listed
          .filter((row) => row.match_count > 0)
          .sort((a, b) => a.sequence - b.sequence);

        setSubrounds(navigable);
        matchesBySubroundRef.current = bySubround;
        setMatchesBySubround(bySubround);

        if (noRound) {
          setSelectedSubroundId(null);
          setBoards([]);
          setBoardLive(false);
          return;
        }

        const next = pickScoresSubround(
          navigable,
          selectedSubroundIdRef.current,
        );
        setSelectedSubroundId(next?.id ?? null);
        await loadScores(next?.id ?? null);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : 'Could not load scores.',
        );
        setSubrounds([]);
        setMatchesBySubround({});
        setSelectedSubroundId(null);
        setBoards([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadScores],
  );

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        void loadCatalog('initial');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadCatalog]);

  // Keep live/mock slate (for badge green + n/6 correct) in step with Matches.
  useEffect(() => {
    if (!boardLive || selectedSubroundId == null) {
      return;
    }
    const id = setInterval(() => {
      void loadScores(selectedSubroundId, { quiet: true });
    }, LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [boardLive, selectedSubroundId, loadScores]);

  const onSelectSubround = useCallback(
    (next: Subround) => {
      setSelectedSubroundId(next.id);
      setExpanded({});
      setError(null);
      void loadScores(next.id);
    },
    [loadScores],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textMuted} />
      </View>
    );
  }

  const showSubroundScrubber =
    subrounds.length > 0 && selectedSubroundId != null;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void loadCatalog('refresh');
          }}
          tintColor={colors.textMuted}
        />
      }
    >
      <View style={styles.wrap}>
        <View style={styles.scrubberRow}>
          {showSubroundScrubber ? (
            <View style={styles.subroundCol}>
              <SubroundScrubber
                subrounds={subrounds}
                selectedId={selectedSubroundId}
                onChange={onSelectSubround}
                labelMode="sequence"
                style={styles.scrubberFlush}
              />
            </View>
          ) : null}
          <View
            style={showSubroundScrubber ? styles.dateCol : styles.dateColFull}
          >
            <KickoffDateDisplay
              kickoffIso={selectedSubround?.min_kickoff}
              style={styles.scrubberFlush}
            />
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {scoresLoading && matches.length > 0 ? (
          <View style={styles.listLoading}>
            <ActivityIndicator color={colors.textMuted} />
          </View>
        ) : null}

        {matches.length === 0 ? (
          <Text style={styles.lede}>
            No Super Six selections for this slate yet.
          </Text>
        ) : rankedBoards.length === 0 ? (
          <Text style={styles.lede}>No player scores for this slate yet.</Text>
        ) : (
          rankedBoards.map((board) => (
            <PlayerScoreSection
              key={board.authId}
              playerName={board.name}
              matches={matches}
              predictions={board.predictions}
              score={board.score}
              slateDifficulty={slateDifficulty}
              expanded={!!expanded[board.authId]}
              now={now}
              onToggleExpand={() =>
                setExpanded((prev) => ({
                  ...prev,
                  [board.authId]: !prev[board.authId],
                }))
              }
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  wrap: {
    paddingHorizontal: '3%',
    paddingTop: 12,
  },
  scrubberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  subroundCol: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  dateCol: {
    flexGrow: 2,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  dateColFull: {
    flex: 1,
    minWidth: 0,
  },
  scrubberFlush: {
    marginBottom: 0,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  lede: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 12,
  },
  error: {
    color: colors.resultLose,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  listLoading: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
