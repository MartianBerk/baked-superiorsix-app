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
  discoveryDayKeys,
  pickGameWeek,
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

function groupByGameWeek(
  matches: PlayerMatch[],
): { weeks: string[]; byWeek: Record<string, PlayerMatch[]> } {
  const byWeek: Record<string, PlayerMatch[]> = {};
  for (const match of matches) {
    const week = utcMondayKey(match.match_date);
    const bucket = byWeek[week] ?? [];
    bucket.push(match);
    byWeek[week] = bucket;
  }
  const weeks = Object.keys(byWeek).sort();
  for (const week of weeks) {
    byWeek[week] = sortPlayerMatches(byWeek[week]);
  }
  return { weeks, byWeek };
}

/**
 * Player fixtures tab: selected Super Six matches for available game weeks,
 * G/W scrubber (only weeks with matches), expandable detail, H/D/A picks.
 */
export function MatchPlayerWidget() {
  const { status, isAuthenticated, token, hasRole } = useAuth();

  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [matchesByWeek, setMatchesByWeek] = useState<
    Record<string, PlayerMatch[]>
  >({});
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const selectedWeekRef = useRef<string | null>(null);
  selectedWeekRef.current = selectedWeek;

  const [draft, setDraft] = useState<Record<number, PredictionChoice | null>>(
    {},
  );
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const canPredict = isAuthenticated && hasRole('player');

  const matches = useMemo(
    () => (selectedWeek ? (matchesByWeek[selectedWeek] ?? []) : []),
    [selectedWeek, matchesByWeek],
  );

  /** Earliest kickoff day in the selected week (banner date — not Monday). */
  const labelDayKey = useMemo(() => {
    if (matches.length === 0) {
      return null;
    }
    let earliest = matches[0];
    for (const match of matches.slice(1)) {
      if (match.match_date.localeCompare(earliest.match_date) < 0) {
        earliest = match;
      }
    }
    return utcDayKey(earliest.match_date);
  }, [matches]);

  const predictedCount = useMemo(
    () =>
      matches.filter((match) => {
        const choice = draft[match.id];
        return choice === 'home' || choice === 'draw' || choice === 'away';
      }).length,
    [matches, draft],
  );

  const loadPredictions = useCallback(
    async (weekMatches: PlayerMatch[]) => {
      if (!token || !canPredict || weekMatches.length === 0) {
        setDraft({});
        return;
      }
      setPredictionsLoading(true);
      try {
        const predictions = await Promise.all(
          weekMatches.map(async (match) => {
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
      } finally {
        setPredictionsLoading(false);
      }
    },
    [token, canPredict],
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
        const dayKeys = discoveryDayKeys();
        const dayResults = await Promise.all(
          dayKeys.map((dayKey) => listLiveMatches(toLegacyDateParam(dayKey))),
        );
        const byId = new Map<number, PlayerMatch>();
        for (const dayMatches of dayResults) {
          for (const match of dayMatches) {
            byId.set(match.id, match);
          }
        }
        let all = [...byId.values()];

        // Hydrate difficulty from matchdetail (livematches omits it).
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

        const { weeks, byWeek } = groupByGameWeek(all);
        setAvailableWeeks(weeks);
        setMatchesByWeek(byWeek);

        const nextWeek = pickGameWeek(weeks, selectedWeekRef.current);
        setSelectedWeek(nextWeek);
        await loadPredictions(nextWeek ? (byWeek[nextWeek] ?? []) : []);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Could not load selected matches.';
        setError(message);
        setAvailableWeeks([]);
        setMatchesByWeek({});
        setSelectedWeek(null);
        setDraft({});
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadPredictions],
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

  const onSelectWeek = useCallback(
    (mondayKey: string) => {
      setSelectedWeek(mondayKey);
      setError(null);
      setRowError(null);
      void loadPredictions(matchesByWeek[mondayKey] ?? []);
    },
    [matchesByWeek, loadPredictions],
  );

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

  if (status === 'loading' || loading) {
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
            void loadCatalog('refresh');
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
          weeks={availableWeeks}
          selectedWeek={selectedWeek}
          labelDayKey={labelDayKey}
          onChange={onSelectWeek}
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

        {predictionsLoading && matches.length > 0 ? (
          <View style={styles.listLoading}>
            <ActivityIndicator color={colors.textMuted} />
          </View>
        ) : matches.length === 0 ? (
          <Text style={styles.empty}>
            No Super Six selections available yet. Once a game master picks the
            six, they show up here.
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
