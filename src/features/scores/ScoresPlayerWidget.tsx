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
import { useAuth } from '@/auth';
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
import {
  anyMatchPlaying,
  LIVE_POLL_MS,
  msUntilNextKickoff,
  shouldPollLiveScores,
} from './liveScoreDisplay';
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

function uniqueMatchDates(matches: LiveMatch[]): string[] {
  const keys = new Set<string>();
  for (const match of matches) {
    keys.add(toLegacyDateParam(utcDayKey(match.match_date)));
  }
  return [...keys];
}

function mergeLiveScoresOntoMatches(
  matches: SlateMatch[],
  boards: LiveScorePlayer[],
): SlateMatch[] {
  const byKey = new Map<string, { home: number | null; away: number | null; status: string }>();
  for (const player of boards) {
    for (const row of player.matches) {
      const key =
        row.match_id != null
          ? `id:${row.match_id}`
          : `teams:${row.home_team}|${row.away_team}`;
      byKey.set(key, {
        home: row.home_score ?? null,
        away: row.away_score ?? null,
        status: row.status || '',
      });
    }
  }
  return matches.map((match) => {
    const hit =
      byKey.get(`id:${match.id}`) ??
      byKey.get(`teams:${match.home_team}|${match.away_team}`);
    if (!hit) {
      return match;
    }
    return {
      ...match,
      home_score: hit.home ?? match.home_score,
      away_score: hit.away ?? match.away_score,
      status: hit.status || match.status,
    };
  });
}

function boardsFromLiveScores(
  scores: LiveScorePlayer[],
  slateMatches: LiveMatch[],
): PlayerBoard[] {
  const matchIds = new Set(slateMatches.map((m) => m.id));
  const byTeams = new Map(
    slateMatches.map((m) => [`${m.home_team}|${m.away_team}`, m.id] as const),
  );

  const boards: PlayerBoard[] = scores.map((player) => {
    const predictions: Record<number, PredictionChoice | null> = {};
    const correctByMatch: Record<number, boolean | null> = {};
    let score = 0;
    for (const row of player.matches) {
      const matchId =
        row.match_id != null && matchIds.has(row.match_id)
          ? row.match_id
          : byTeams.get(`${row.home_team}|${row.away_team}`);
      if (matchId == null) {
        continue;
      }
      predictions[matchId] = row.prediction;
      correctByMatch[matchId] = row.correct;
      if (row.correct) {
        score += 1;
      }
    }
    return {
      authId: player.auth_id,
      name: player.name,
      score: player.score || score,
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
 * Player Scores tab: admin-predictions layout without expand/predict.
 * Wires SS-16 livescores (batch) + livematches for the slate; polls every 2m
 * while the live set is active.
 */
export function ScoresPlayerWidget() {
  const { session } = useAuth();
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
  const [livescoresReady, setLivescoresReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const clockMatches = useMemo(
    () =>
      matches.map((m) => ({
        matchDateIso: m.match_date,
        status: m.status,
      })),
    [matches],
  );

  const liveFlash = anyMatchPlaying(clockMatches);

  const viewerCorrect = useMemo(() => {
    if (boards.length === 0) {
      return null;
    }
    const authId = session?.userId;
    if (authId) {
      const mine = boards.find((b) => b.authId === authId);
      if (mine) {
        return mine.score;
      }
    }
    return null;
  }, [boards, session?.userId]);

  useEffect(() => {
    if (matches.length === 0 || viewerCorrect == null) {
      setPlayerPickingStatus(null);
      return () => {
        setPlayerPickingStatus(null);
      };
    }
    const playing = anyMatchPlaying(clockMatches);
    setPlayerPickingStatus({
      phase: playing ? 'live' : 'finished',
      correctCount: viewerCorrect,
    });
    return () => {
      setPlayerPickingStatus(null);
    };
  }, [matches.length, clockMatches, viewerCorrect, setPlayerPickingStatus]);

  const applyScores = useCallback(
    (slateMatches: SlateMatch[], scores: LiveScorePlayer[] | null) => {
      if (scores == null) {
        setLivescoresReady(false);
        setBoards([]);
        return slateMatches;
      }
      setLivescoresReady(true);
      setBoards(boardsFromLiveScores(scores, slateMatches));
      return mergeLiveScoresOntoMatches(slateMatches, scores);
    },
    [],
  );

  const loadScores = useCallback(
    async (slateMatches: SlateMatch[]) => {
      if (slateMatches.length === 0) {
        setBoards([]);
        setLivescoresReady(true);
        return;
      }
      setScoresLoading(true);
      try {
        const dates = uniqueMatchDates(slateMatches);
        const batches = await Promise.all(
          dates.map(async (matchDate) => {
            try {
              return await getLiveScores(matchDate);
            } catch (err) {
              if (err instanceof ApiError && err.status === 501) {
                return null;
              }
              throw err;
            }
          }),
        );
        if (batches.some((b) => b == null)) {
          setLivescoresReady(false);
          setBoards([]);
          return;
        }
        const mergedPlayers = new Map<string, LiveScorePlayer>();
        for (const batch of batches) {
          if (!batch) {
            continue;
          }
          for (const player of batch) {
            const existing = mergedPlayers.get(player.auth_id);
            if (!existing) {
              mergedPlayers.set(player.auth_id, {
                ...player,
                matches: [...player.matches],
              });
              continue;
            }
            existing.matches.push(...player.matches);
            existing.score = Math.max(existing.score, player.score);
          }
        }
        const scores = [...mergedPlayers.values()];
        const nextMatches = applyScores(slateMatches, scores);
        if (selectedSubroundIdRef.current != null) {
          setMatchesBySubround((prev) => ({
            ...prev,
            [selectedSubroundIdRef.current as number]: nextMatches,
          }));
        }
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Could not load live scores.',
        );
      } finally {
        setScoresLoading(false);
      }
    },
    [applyScores],
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
        setMatchesBySubround(bySubround);

        if (noRound) {
          setSelectedSubroundId(null);
          setBoards([]);
          return;
        }

        const next = pickScoresSubround(navigable, selectedSubroundIdRef.current);
        setSelectedSubroundId(next?.id ?? null);
        await loadScores(next ? (bySubround[next.id] ?? []) : []);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Could not load scores.',
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

  // Tick wall clock so `- : -` → `0 : 0` flips at kickoff without a poll.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  // Live poll: every 2 min while the live set is active; wake at next kickoff.
  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let wakeTimer: ReturnType<typeof setTimeout> | null = null;

    const clearPoll = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const tick = () => {
      setNow(new Date());
      const current =
        selectedSubroundIdRef.current != null
          ? (matchesBySubround[selectedSubroundIdRef.current] ?? [])
          : [];
      const clocks = current.map((m) => ({
        matchDateIso: m.match_date,
        status: m.status,
      }));
      if (shouldPollLiveScores(clocks)) {
        void loadScores(current);
      }
    };

    const arm = () => {
      clearPoll();
      if (wakeTimer) {
        clearTimeout(wakeTimer);
        wakeTimer = null;
      }
      const current =
        selectedSubroundIdRef.current != null
          ? (matchesBySubround[selectedSubroundIdRef.current] ?? [])
          : [];
      const clocks = current.map((m) => ({
        matchDateIso: m.match_date,
        status: m.status,
      }));
      if (shouldPollLiveScores(clocks, new Date())) {
        void loadScores(current);
        pollTimer = setInterval(tick, LIVE_POLL_MS);
        return;
      }
      const wait = msUntilNextKickoff(clocks, new Date());
      if (wait != null && wait > 0 && wait < 24 * 60 * 60 * 1000) {
        wakeTimer = setTimeout(() => {
          arm();
        }, wait + 250);
      }
    };

    arm();
    return () => {
      clearPoll();
      if (wakeTimer) {
        clearTimeout(wakeTimer);
      }
    };
  }, [matchesBySubround, selectedSubroundId, loadScores]);

  const onSelectSubround = useCallback(
    (next: Subround) => {
      setSelectedSubroundId(next.id);
      setError(null);
      void loadScores(matchesBySubround[next.id] ?? []);
    },
    [matchesBySubround, loadScores],
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
              live={liveFlash}
              style={styles.scrubberFlush}
            />
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!livescoresReady ? (
          <Text style={styles.lede}>
            Live scoreboard API not ready yet (SS-16 `/game/livescores`). Slate
            fixtures still load below once available.
          </Text>
        ) : null}

        {scoresLoading && matches.length > 0 ? (
          <View style={styles.listLoading}>
            <ActivityIndicator color={colors.textMuted} />
          </View>
        ) : null}

        {matches.length === 0 ? (
          <Text style={styles.lede}>
            No Super Six selections for this slate yet.
          </Text>
        ) : boards.length === 0 && livescoresReady ? (
          <Text style={styles.lede}>
            No player scores for this slate yet.
          </Text>
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
              now={now}
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
