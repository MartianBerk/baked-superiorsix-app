import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  addPrediction,
  fetchMatchDetail,
  getPrediction,
  listLiveMatches,
  type PredictionChoice,
} from '@/api/superiorsix';
import { ApiError } from '@/api/errors';
import { useAuth } from '@/auth';
import { LoginForm } from '@/features/auth/LoginForm';
import { colors } from '@/theme';

import {
  gameWeekDayKeys,
  gameWeekStartKeys,
  toLegacyDateParam,
  utcDayKey,
  utcMondayKey,
} from './formatMatchDate';
import { GameWeekScrubber } from './GameWeekScrubber';
import {
  MatchPredictRow,
  type PlayerMatch,
} from './MatchPredictRow';

/** BE cutoff: predictions lock 10 minutes before kickoff. */
const CUTOFF_MS = 10 * 60 * 1000;

function isPastCutoff(matchDateIso: string, now: Date = new Date()): boolean {
  const kickoff = new Date(matchDateIso).getTime();
  if (!Number.isFinite(kickoff)) {
    return false;
  }
  return now.getTime() + CUTOFF_MS >= kickoff;
}

function sortPlayerMatches(matches: PlayerMatch[]): PlayerMatch[] {
  return [...matches].sort((a, b) => {
    const aNum = a.game_number ?? 99;
    const bNum = b.game_number ?? 99;
    if (aNum !== bNum) {
      return aNum - bNum;
    }
    return a.match_date.localeCompare(b.match_date) || a.id - b.id;
  });
}

/**
 * Player fixtures tab: selected Super Six matches for the game week, G/W
 * scrubber, expandable detail, Home/Draw/Away predictions.
 */
export function MatchPlayerWidget() {
  const { status, isAuthenticated, token, hasRole } = useAuth();

  const weeks = useMemo(() => gameWeekStartKeys(), []);
  const [selectedWeek, setSelectedWeek] = useState<string>(() =>
    utcMondayKey(),
  );
  const [matches, setMatches] = useState<PlayerMatch[]>([]);
  const [draft, setDraft] = useState<Record<number, PredictionChoice | null>>(
    {},
  );
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const canPredict = isAuthenticated && hasRole('player');

  const predictedCount = useMemo(
    () =>
      matches.filter((match) => {
        const choice = draft[match.id];
        return choice === 'home' || choice === 'draw' || choice === 'away';
      }).length,
    [matches, draft],
  );

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      setRowError(null);
      try {
        const dayKeys = gameWeekDayKeys(selectedWeek);
        const dayResults = await Promise.all(
          dayKeys.map((dayKey) => listLiveMatches(toLegacyDateParam(dayKey))),
        );
        const byId = new Map<number, PlayerMatch>();
        for (const dayMatches of dayResults) {
          for (const match of dayMatches) {
            byId.set(match.id, match);
          }
        }
        let next = sortPlayerMatches([...byId.values()]);

        // Hydrate difficulty from matchdetail (livematches omits it).
        const details = await Promise.all(
          next.map(async (match) => {
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
        next = next.map((match) => ({
          ...match,
          difficulty: difficultyById.get(match.id) ?? null,
        }));
        setMatches(next);

        if (token && canPredict && next.length > 0) {
          const predictions = await Promise.all(
            next.map(async (match) => {
              try {
                const choice = await getPrediction(token, match.id);
                return [match.id, choice] as const;
              } catch {
                return [match.id, null] as const;
              }
            }),
          );
          const nextDraft: Record<number, PredictionChoice | null> = {};
          for (const [id, choice] of predictions) {
            nextDraft[id] = choice;
          }
          setDraft(nextDraft);
        } else {
          setDraft({});
        }
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Could not load selected matches.';
        setError(message);
        setMatches([]);
        setDraft({});
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, canPredict, selectedWeek],
  );

  useEffect(() => {
    if (status === 'loading') {
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        void load('initial');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [status, load]);

  const onPredict = useCallback(
    async (match: PlayerMatch, choice: PredictionChoice) => {
      if (!token || !canPredict) {
        return;
      }
      if (draft[match.id] === choice) {
        return;
      }
      if (isPastCutoff(match.match_date) || match.status === 'POSTPONED') {
        setRowError('Past cutoff for prediction set.');
        return;
      }
      setBusyId(match.id);
      setRowError(null);
      const previous = draft[match.id] ?? null;
      setDraft((prev) => ({ ...prev, [match.id]: choice }));
      try {
        const saved = await addPrediction(token, match.id, choice);
        setDraft((prev) => ({ ...prev, [match.id]: saved.prediction }));
      } catch (err) {
        setDraft((prev) => ({ ...prev, [match.id]: previous }));
        setRowError(
          err instanceof ApiError
            ? err.message
            : 'Could not save prediction.',
        );
      } finally {
        setBusyId(null);
      }
    },
    [token, canPredict, draft],
  );

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textMuted} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void load('refresh');
          }}
          tintColor={colors.textMuted}
        />
      }
    >
      <View style={styles.wrap}>
        <View style={styles.headerStrip}>
          <Text style={styles.headerLabel}>
            {`Predictions:   ${predictedCount} / ${matches.length || 6}`}
          </Text>
        </View>
        <GameWeekScrubber
          weeks={weeks}
          selectedWeek={selectedWeek}
          onChange={(mondayKey) => {
            setSelectedWeek(mondayKey);
            setError(null);
            setRowError(null);
          }}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {rowError ? <Text style={styles.error}>{rowError}</Text> : null}

        {!isAuthenticated ? (
          <View style={styles.loginBlock}>
            <Text style={styles.lede}>
              Browse this week&apos;s Super Six, then sign in to lock in Home /
              Draw / Away.
            </Text>
            <LoginForm heading="Player sign in" />
          </View>
        ) : null}

        {isAuthenticated && !canPredict ? (
          <Text style={styles.lede}>
            Predictions need the superiorsix player role and an accepted roster
            invite.
          </Text>
        ) : null}

        {loading ? (
          <View style={styles.listLoading}>
            <ActivityIndicator color={colors.textMuted} />
          </View>
        ) : matches.length === 0 ? (
          <Text style={styles.empty}>
            No Super Six selections for this game week. Scrub to another week,
            or wait for a game master to pick the six.
          </Text>
        ) : (
          <View style={styles.card}>
            {matches.map((match) => (
              <MatchPredictRow
                key={match.id}
                match={match}
                prediction={draft[match.id] ?? null}
                busy={busyId === match.id}
                locked={isPastCutoff(match.match_date)}
                canPredict={canPredict}
                onPredict={(choice) => {
                  void onPredict(match, choice);
                }}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingBottom: 32,
  },
  wrap: {
    paddingHorizontal: '3%',
    paddingTop: 12,
  },
  headerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  headerLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  lede: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  loginBlock: {
    marginBottom: 16,
  },
  error: {
    color: '#E8A0A0',
    fontSize: 13,
    marginBottom: 10,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  listLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
});
