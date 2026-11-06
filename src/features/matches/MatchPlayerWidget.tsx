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
  listGameSubrounds,
  listLiveMatches,
  type PredictionChoice,
  type Subround,
} from '@/api/superiorsix';
import { ApiError } from '@/api/errors';
import { useAuth } from '@/auth';
import { LoginForm } from '@/features/auth/LoginForm';
import { colors } from '@/theme';

import {
  discoveryDayKeys,
  toLegacyDateParam,
  utcDayKey,
} from './formatMatchDate';
import {
  MatchPredictRow,
  type PlayerMatch,
} from './MatchPredictRow';
import { SubroundScrubber } from './SubroundScrubber';

/**
 * FE subround lock: all picks lock once `now + 10m >= min_kickoff`
 * (matches BE `/user/addprediction` cutoff for the match’s subround).
 */
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

function groupBySubround(
  matches: PlayerMatch[],
): Record<number, PlayerMatch[]> {
  const byId: Record<number, PlayerMatch[]> = {};
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
    byId[Number(key)] = sortPlayerMatches(byId[Number(key)]);
  }
  return byId;
}

/** Prefer open-for-editing with matches; else latest active; else latest. */
function pickPlayerSubround(
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
  const open = withMatches.find((row) => row.is_open_for_editing && !row.is_over);
  if (open) {
    return open;
  }
  const active = withMatches.filter((row) => !row.is_over);
  if (active.length > 0) {
    return active[active.length - 1];
  }
  return withMatches[withMatches.length - 1];
}

/**
 * Player fixtures: navigate Super Six selections by subround, expandable
 * detail, Home/Draw/Away with subround-wide cutoff.
 */
export function MatchPlayerWidget() {
  const { status, isAuthenticated, token, hasRole } = useAuth();

  const [subrounds, setSubrounds] = useState<Subround[]>([]);
  const [matchesBySubround, setMatchesBySubround] = useState<
    Record<number, PlayerMatch[]>
  >({});
  const [selectedSubroundId, setSelectedSubroundId] = useState<number | null>(
    null,
  );
  const selectedSubroundIdRef = useRef<number | null>(null);
  selectedSubroundIdRef.current = selectedSubroundId;

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

  /** Lock every Home/Draw/Away once earliest kickoff in this subround hits cutoff. */
  const subroundLocked = useMemo(() => {
    const minKickoff = selectedSubround?.min_kickoff;
    if (minKickoff) {
      return isPastCutoff(minKickoff);
    }
    return false;
  }, [selectedSubround]);

  const loadPredictions = useCallback(
    async (slateMatches: PlayerMatch[]) => {
      if (!token || !canPredict || slateMatches.length === 0) {
        setDraft({});
        return;
      }
      setPredictionsLoading(true);
      try {
        const predictions = await Promise.all(
          slateMatches.map(async (match) => {
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
        const [listed, dayResults] = await Promise.all([
          listGameSubrounds(),
          Promise.all(
            discoveryDayKeys().map((dayKey) =>
              listLiveMatches(toLegacyDateParam(dayKey)),
            ),
          ),
        ]);

        const byId = new Map<number, PlayerMatch>();
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
        // Player scrubber: only subrounds that have selections.
        const navigable = listed
          .filter((row) => row.match_count > 0)
          .sort((a, b) => a.sequence - b.sequence);

        setSubrounds(navigable);
        setMatchesBySubround(bySubround);

        const next = pickPlayerSubround(
          navigable,
          selectedSubroundIdRef.current,
        );
        setSelectedSubroundId(next?.id ?? null);
        await loadPredictions(next ? (bySubround[next.id] ?? []) : []);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Could not load selected matches.';
        setError(message);
        setSubrounds([]);
        setMatchesBySubround({});
        setSelectedSubroundId(null);
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
    async (match: PlayerMatch, choice: PredictionChoice) => {
      if (!token || !canPredict) {
        return;
      }
      if (draft[match.id] === choice) {
        return;
      }
      if (subroundLocked || match.status === 'POSTPONED') {
        setRowError(
          subroundLocked
            ? 'Past cutoff for this subround\'s predictions.'
            : 'Past cutoff for prediction set.',
        );
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
    [token, canPredict, draft, subroundLocked],
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
        <SubroundScrubber
          subrounds={subrounds}
          selectedId={selectedSubroundId}
          onChange={onSelectSubround}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {rowError ? <Text style={styles.error}>{rowError}</Text> : null}
        {subroundLocked && matches.length > 0 ? (
          <Text style={styles.lede}>
            Predictions locked — within 10 minutes of this slate&apos;s first
            kickoff.
          </Text>
        ) : null}

        {!isAuthenticated ? (
          <View style={styles.loginBlock}>
            <Text style={styles.lede}>
              Browse this slate&apos;s Super Six, then sign in to lock in Home /
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
                locked={subroundLocked}
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
