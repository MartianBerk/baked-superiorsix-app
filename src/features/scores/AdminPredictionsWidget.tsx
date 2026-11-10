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
  addAdminPrediction,
  fetchMatchDetail,
  isNoRoundInProgressError,
  listAdminPredictions,
  listGameSubrounds,
  listLiveMatches,
  listPlayers,
  type LiveMatch,
  type MatchDifficulty,
  type PlayerProfile,
  type PredictionChoice,
  type Subround,
} from '@/api/superiorsix';
import { ApiError } from '@/api/errors';
import { useAuth } from '@/auth';
import { LoginForm } from '@/features/auth/LoginForm';
import {
  discoveryDayKeys,
  toLegacyDateParam,
  utcDayKey,
} from '@/features/matches/formatMatchDate';
import { SubroundScrubber } from '@/features/matches/SubroundScrubber';
import { colors } from '@/theme';

import { AdminPlayerPredictionSection } from './AdminPlayerPredictionSection';
import { KickoffDateDisplay } from './KickoffDateDisplay';
import { isPostponedStatus } from './liveScoreDisplay';
import { playerLabel } from './playerLabel';
import { useScoresTabMode } from './ScoresTabModeContext';

const ADMIN_ROLE = 'admin';

type SlateMatch = LiveMatch & {
  difficulty?: MatchDifficulty | null;
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

/** Prefer open-for-editing with matches; else latest active; else latest. */
function pickAdminSubround(
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
  const open = withMatches.find(
    (row) => row.is_open_for_editing && !row.is_over,
  );
  if (open) {
    return open;
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

/**
 * Admin Scores mode: expandable per-player prediction editor for the current
 * Super Six slate. Tapping H/D/A submits via `/admin/addprediction` (SS-17).
 */
export function AdminPredictionsWidget() {
  const { status, isAuthenticated, token, hasRole } = useAuth();
  const { setMode } = useScoresTabMode();

  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [subrounds, setSubrounds] = useState<Subround[]>([]);
  const [matchesBySubround, setMatchesBySubround] = useState<
    Record<number, SlateMatch[]>
  >({});
  const [selectedSubroundId, setSelectedSubroundId] = useState<number | null>(
    null,
  );
  const selectedSubroundIdRef = useRef<number | null>(null);

  /** authId → matchId → prediction */
  const [draft, setDraft] = useState<
    Record<string, Record<number, PredictionChoice | null>>
  >({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  /** `${authId}:${matchId}` while a save is in flight. */
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const canManage = isAuthenticated && hasRole(ADMIN_ROLE);

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

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) =>
      playerLabel(a).localeCompare(playerLabel(b), undefined, {
        sensitivity: 'base',
      }),
    );
  }, [players]);

  const loadPredictions = useCallback(
    async (slateMatches: LiveMatch[]) => {
      if (!token || !canManage || slateMatches.length === 0) {
        setDraft({});
        return;
      }
      setPredictionsLoading(true);
      try {
        const dates = uniqueMatchDates(slateMatches);
        const batches = await Promise.all(
          dates.map(async (matchDate) => {
            try {
              return await listAdminPredictions(token, { matchDate });
            } catch (err) {
              if (err instanceof ApiError && err.status === 501) {
                return [];
              }
              throw err;
            }
          }),
        );
        const matchIds = new Set(slateMatches.map((m) => m.id));
        const next: Record<string, Record<number, PredictionChoice | null>> =
          {};
        for (const batch of batches) {
          for (const row of batch) {
            if (!matchIds.has(row.match_id)) {
              continue;
            }
            const byMatch = next[row.auth_id] ?? {};
            byMatch[row.match_id] = row.prediction;
            next[row.auth_id] = byMatch;
          }
        }
        setDraft(next);
      } catch (err) {
        setDraft({});
        setRowError(
          err instanceof ApiError
            ? err.message
            : 'Could not load admin predictions.',
        );
      } finally {
        setPredictionsLoading(false);
      }
    },
    [token, canManage],
  );

  const loadCatalog = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      setRowError(null);
      try {
        if (!token || !canManage) {
          setPlayers([]);
          setSubrounds([]);
          setMatchesBySubround({});
          setSelectedSubroundId(null);
          setDraft({});
          return;
        }

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

        const [roster, ...dayResults] = await Promise.all([
          listPlayers(token, true),
          ...discoveryDayKeys().map((dayKey) =>
            listLiveMatches({ matchDate: toLegacyDateParam(dayKey) }),
          ),
        ]);

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
              const detail = await fetchMatchDetail({ matchId: match.id });
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

        setPlayers(roster.filter((p) => p.active && !p.retired));
        setSubrounds(navigable);
        setMatchesBySubround(bySubround);

        if (noRound) {
          setSelectedSubroundId(null);
          setDraft({});
          return;
        }

        const next = pickAdminSubround(navigable, selectedSubroundIdRef.current);
        setSelectedSubroundId(next?.id ?? null);
        await loadPredictions(next ? (bySubround[next.id] ?? []) : []);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Could not load admin predictions.',
        );
        setPlayers([]);
        setSubrounds([]);
        setMatchesBySubround({});
        setSelectedSubroundId(null);
        setDraft({});
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, canManage, loadPredictions],
  );

  useEffect(() => {
    if (status === 'loading') {
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        void loadCatalog('initial');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [status, loadCatalog]);

  const onSelectSubround = useCallback(
    (next: Subround) => {
      setSelectedSubroundId(next.id);
      setError(null);
      setRowError(null);
      void loadPredictions(matchesBySubround[next.id] ?? []);
    },
    [matchesBySubround, loadPredictions],
  );

  const onPredict = useCallback(
    async (
      player: PlayerProfile,
      match: LiveMatch,
      choice: PredictionChoice,
    ) => {
      if (!token || !canManage) {
        return;
      }
      const previous = draft[player.auth_id]?.[match.id] ?? null;
      if (previous === choice) {
        return;
      }
      if (isPostponedStatus(match.status)) {
        setRowError('This match is postponed.');
        return;
      }
      const key = `${player.auth_id}:${match.id}`;
      setBusyKey(key);
      setRowError(null);
      setDraft((prev) => ({
        ...prev,
        [player.auth_id]: {
          ...(prev[player.auth_id] ?? {}),
          [match.id]: choice,
        },
      }));
      try {
        const saved = await addAdminPrediction(token, {
          authId: player.auth_id,
          matchId: match.id,
          prediction: choice,
        });
        setDraft((prev) => ({
          ...prev,
          [saved.authId]: {
            ...(prev[saved.authId] ?? {}),
            [saved.matchId]: saved.prediction,
          },
        }));
      } catch (err) {
        setDraft((prev) => ({
          ...prev,
          [player.auth_id]: {
            ...(prev[player.auth_id] ?? {}),
            [match.id]: previous,
          },
        }));
        setRowError(
          err instanceof ApiError
            ? err.message
            : 'Could not save admin prediction.',
        );
      } finally {
        setBusyKey(null);
      }
    },
    [token, canManage, draft],
  );

  if (status === 'loading' || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textMuted} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.wrap}>
          <Text style={styles.lede}>
            Sign in with a superiorsix admin account to enter predictions on
            behalf of players.
          </Text>
          <LoginForm />
          <Text
            style={styles.backLink}
            onPress={() => setMode('normal')}
            accessibilityRole="link"
          >
            Back to Scores
          </Text>
        </View>
      </ScrollView>
    );
  }

  if (!canManage) {
    return (
      <View style={styles.center}>
        <Text style={styles.lede}>
          Entering player predictions needs the superiorsix admin role.
        </Text>
        <Text
          style={styles.backLink}
          onPress={() => setMode('normal')}
          accessibilityRole="link"
        >
          Back to Scores
        </Text>
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
        {rowError ? <Text style={styles.error}>{rowError}</Text> : null}

        {predictionsLoading && matches.length > 0 ? (
          <View style={styles.listLoading}>
            <ActivityIndicator color={colors.textMuted} />
          </View>
        ) : null}

        {matches.length === 0 ? (
          <Text style={styles.lede}>
            No Super Six selections for this slate yet. Pick matches on
            Fixtures (admin).
          </Text>
        ) : sortedPlayers.length === 0 ? (
          <Text style={styles.lede}>No active rostered players.</Text>
        ) : (
          sortedPlayers.map((player) => (
            <AdminPlayerPredictionSection
              key={player.auth_id}
              playerName={playerLabel(player)}
              matches={matches}
              predictions={draft[player.auth_id] ?? {}}
              expanded={!!expanded[player.auth_id]}
              onToggleExpand={() =>
                setExpanded((prev) => ({
                  ...prev,
                  [player.auth_id]: !prev[player.auth_id],
                }))
              }
              busyMatchId={(() => {
                if (!busyKey?.startsWith(`${player.auth_id}:`)) {
                  return null;
                }
                const id = Number(busyKey.slice(player.auth_id.length + 1));
                return Number.isFinite(id) ? id : null;
              })()}
              disabled={!canManage}
              onSelect={(match, choice) => {
                void onPredict(player, match, choice);
              }}
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
  /** ~33% — navigable slate scrubber. */
  subroundCol: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  /** ~66% — display-only earliest kickoff. */
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
  backLink: {
    marginTop: 16,
    color: colors.accentBright,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
