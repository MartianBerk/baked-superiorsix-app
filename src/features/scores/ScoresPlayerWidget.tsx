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
  type LiveScorePlayer,
  type MatchDifficulty,
  type PredictionChoice,
  type Subround,
} from '@/api/superiorsix';
import { ApiError } from '@/api/errors';
import {
  discoveryDayKeys,
  toLegacyDateParam,
  utcDayKey,
} from '@/features/matches/formatMatchDate';
import { aggregateSelectionDifficulty } from '@/features/matches/matchDifficulty';
import { SubroundScrubber } from '@/features/matches/SubroundScrubber';
import { colors } from '@/theme';

import { KickoffDateDisplay } from './KickoffDateDisplay';
import { PlayerScoreSection } from './PlayerScoreSection';

type SlateMatch = LiveMatch & {
  difficulty?: MatchDifficulty | null;
};

type PlayerBoard = {
  authId: string;
  name: string;
  score: number;
  predictions: Record<number, PredictionChoice | null>;
  correctByMatch: Record<number, boolean | null>;
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
  const boards: PlayerBoard[] = scores.map((player) => {
    const predictions: Record<number, PredictionChoice | null> = {};
    const correctByMatch: Record<number, boolean | null> = {};
    for (const row of player.matches) {
      predictions[row.match_id] = row.prediction;
      correctByMatch[row.match_id] = row.correct;
    }
    return {
      authId: player.auth_id,
      name: player.name,
      score: player.score,
      predictions,
      correctByMatch,
    };
  });

  boards.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
  return boards;
}

/**
 * Player Scores: admin-predictions layout without expand/predict.
 * Picks/board only — no live score chrome (that owns Matches player).
 */
export function ScoresPlayerWidget() {
  const [subrounds, setSubrounds] = useState<Subround[]>([]);
  const [matchesBySubround, setMatchesBySubround] = useState<
    Record<number, SlateMatch[]>
  >({});
  const [selectedSubroundId, setSelectedSubroundId] = useState<number | null>(
    null,
  );
  const selectedSubroundIdRef = useRef<number | null>(null);

  const [boards, setBoards] = useState<PlayerBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const loadScores = useCallback(async (subroundId: number | null) => {
    if (subroundId == null) {
      setBoards([]);
      return;
    }
    setScoresLoading(true);
    try {
      const board = await getLiveScores({ subroundId });
      setBoards(boardsFromLiveScores(board.scores));
    } catch (err) {
      if (err instanceof ApiError && err.status === 501) {
        setBoards([]);
        return;
      }
      setError(
        err instanceof ApiError ? err.message : 'Could not load scores.',
      );
    } finally {
      setScoresLoading(false);
    }
  }, []);

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
        setMatchesBySubround(bySubround);

        if (noRound) {
          setSelectedSubroundId(null);
          setBoards([]);
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

  const onSelectSubround = useCallback(
    (next: Subround) => {
      setSelectedSubroundId(next.id);
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
        ) : boards.length === 0 ? (
          <Text style={styles.lede}>No player scores for this slate yet.</Text>
        ) : (
          boards.map((board) => (
            <PlayerScoreSection
              key={board.authId}
              playerName={board.name}
              matches={matches}
              predictions={board.predictions}
              correctByMatch={board.correctByMatch}
              score={board.score}
              slateDifficulty={slateDifficulty}
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
