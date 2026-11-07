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
import { useAuth } from '@/auth';
import type { PerfectSixHolder } from '@/components/shell/potBanner';
import {
  buildPlayerRoundStatus,
  countSelectedPredictions,
  resolvePlayerRoundPhase,
} from '@/components/shell/playerRoundStatus';
import { useRoundStatus } from '@/components/shell/RoundStatusContext';
import {
  discoveryDayKeys,
  toLegacyDateParam,
  utcDayKey,
} from '@/features/matches/formatMatchDate';
import { aggregateSelectionDifficulty } from '@/features/matches/matchDifficulty';
import { SubroundScrubber } from '@/features/matches/SubroundScrubber';
import { colors } from '@/theme';

import { KickoffDateDisplay } from './KickoffDateDisplay';
import { LIVE_POLL_MS, LOCK_BEFORE_KICKOFF_MS } from './liveScoreDisplay';
import { isPickCurrentlyCorrect } from './pickOutcome';
import { PlayerScoreSection } from './PlayerScoreSection';

type SlateMatch = LiveMatch & {
  difficulty?: MatchDifficulty | null;
};

type PlayerBoard = {
  authId: string;
  name: string;
  /** Display numerator: selected while picking, correct once live/finished. */
  score: number;
  /** Set prediction badges (Matches-equivalent numerator). */
  selected: number;
  /** Correct picks vs live/finished scoreline. */
  correct: number;
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
    const selected = countSelectedPredictions(Object.values(predictions));
    return {
      authId: player.auth_id,
      name: displayNameFromLiveScore(player),
      // Placeholders — display score is recomputed from live slate + picks.
      score: selected,
      selected,
      correct: 0,
      predictions,
    };
  });
}

function displayNameFromLiveScore(row: LiveScorePlayer): string {
  if (typeof row.nickname === 'string' && row.nickname.trim()) {
    return row.nickname.trim();
  }
  if (typeof row.first_name === 'string' && row.first_name.trim()) {
    return row.first_name.trim();
  }
  if (row.name.trim()) {
    return row.name.trim();
  }
  return 'Player';
}

function perfectSixFromCorrect(
  boards: PlayerBoard[],
  correctByAuth: Map<string, number>,
  viewerAuthId: string | null | undefined,
  slateSize: number,
): PerfectSixHolder[] {
  const need = slateSize > 0 ? slateSize : 6;
  return boards
    .filter((row) => (correctByAuth.get(row.authId) ?? 0) >= need)
    .map((row) => ({
      displayName: row.name,
      isViewer: viewerAuthId != null && row.authId === viewerAuthId,
    }));
}

/** Correct picks for this player against the live slate. */
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

function isKickoffLocked(
  minKickoff: string | null | undefined,
  now: Date,
): boolean {
  if (!minKickoff) {
    return false;
  }
  const kickoffMs = Date.parse(minKickoff);
  if (!Number.isFinite(kickoffMs)) {
    return false;
  }
  return now.getTime() + LOCK_BEFORE_KICKOFF_MS >= kickoffMs;
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
 * Slate fixtures merge `/game/livescores` so badges / n/6 correct counts
 * stay in sync with Matches.
 */
export function ScoresPlayerWidget() {
  const { isAuthenticated, session } = useAuth();
  const { setPlayerPickingStatus } = useRoundStatus();

  const [subrounds, setSubrounds] = useState<Subround[]>([]);
  const [matchesBySubround, setMatchesBySubround] = useState<
    Record<number, SlateMatch[]>
  >({});
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
  /** True when BE reports no open parent round — Scores stays blank. */
  const [noActiveRound, setNoActiveRound] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    selectedSubroundIdRef.current = selectedSubroundId;
  }, [selectedSubroundId]);

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

  const slateSize =
    matches.length > 0
      ? matches.length
      : (selectedSubround?.match_count ?? 0);

  const kickoffLocked = isKickoffLocked(
    selectedSubround?.min_kickoff ?? matches[0]?.match_date,
    now,
  );

  const roundPhase = resolvePlayerRoundPhase({
    boardLive,
    subroundOver: selectedSubround?.is_over === true,
    kickoffLocked,
  });

  /**
   * Row + header numerator: while picking, count set predictions (badges),
   * same as Matches. Once live/finished, count correct picks.
   */
  const rankedBoards = useMemo(() => {
    const withScores = boards.map((board) => {
      const selected = countSelectedPredictions(
        Object.values(board.predictions),
      );
      const correct = countCorrectPicks(board.predictions, matches, now);
      return {
        ...board,
        selected,
        correct,
        score: roundPhase === 'picking' ? selected : correct,
      };
    });
    return sortBoardsByCorrect(withScores);
  }, [boards, matches, now, roundPhase]);

  useEffect(() => {
    // Publish the same RoundStatus shape Matches uses (shared builder).
    if (!isAuthenticated) {
      setPlayerPickingStatus(null);
      return;
    }
    if (slateSize <= 0 && rankedBoards.length === 0) {
      return;
    }
    const authId = session?.userId;
    const viewer =
      authId != null
        ? rankedBoards.find((row) => row.authId === authId)
        : undefined;
    const correctByAuth = new Map(
      rankedBoards.map((row) => [row.authId, row.correct] as const),
    );
    const perfectSix = perfectSixFromCorrect(
      rankedBoards,
      correctByAuth,
      authId,
      slateSize,
    );
    setPlayerPickingStatus(
      buildPlayerRoundStatus({
        phase: roundPhase,
        slateSize,
        selectedCount: viewer?.selected ?? 0,
        correctCount: viewer?.correct ?? 0,
        perfectSix,
        // Banner pips = selected slate matches, not prediction completeness.
        slateDifficulty,
      }),
    );
  }, [
    isAuthenticated,
    session?.userId,
    rankedBoards,
    slateSize,
    slateDifficulty,
    roundPhase,
    setPlayerPickingStatus,
  ]);

  const applyLiveBoard = useCallback(
    (subroundId: number, board: Awaited<ReturnType<typeof getLiveScores>>) => {
      setBoardLive(board.live);
      setBoards(boardsFromLiveScores(board.scores));
      setMatchesBySubround((prev) => ({
        ...prev,
        [subroundId]: mergeBoardFixtures(prev[subroundId] ?? [], board.matches),
      }));
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
      try {
        const board = await getLiveScores({ subroundId });
        applyLiveBoard(subroundId, board);
      } catch (err) {
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
        setNoActiveRound(noRound);

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
        setNoActiveRound(false);
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

  // Keep live slate (badge green + n/6 correct) in step with Matches.
  useEffect(() => {
    if (!boardLive || selectedSubroundId == null) {
      return;
    }
    const id = setInterval(() => {
      void loadScores(selectedSubroundId, { quiet: true });
    }, LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [boardLive, selectedSubroundId, loadScores]);

  useEffect(() => {
    if (!boardLive) {
      return;
    }
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, [boardLive]);

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
  /** No open round (or nothing to show) → blank Scores surface. */
  const blankScores =
    noActiveRound || (subrounds.length === 0 && matches.length === 0);

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
      {blankScores ? (
        <View style={styles.wrap}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      ) : (
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
                kickoffIso={
                  selectedSubround?.min_kickoff ?? matches[0]?.match_date
                }
                live={boardLive}
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

          {matches.length > 0 && rankedBoards.length > 0
            ? rankedBoards.map((board) => (
                <PlayerScoreSection
                  key={board.authId}
                  playerName={board.name}
                  matches={matches}
                  predictions={board.predictions}
                  score={board.score}
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
            : null}
        </View>
      )}
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
    // Header already owns the top gap (AppHeader paddingBottom 12).
    paddingTop: 0,
  },
  scrubberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    // Same 12px rhythm as header → scrubber.
    marginBottom: 12,
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
