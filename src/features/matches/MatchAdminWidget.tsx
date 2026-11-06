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
  addMatch,
  dropMatch,
  listLeagues,
  listMatchesNew,
  type AdminMatch,
  type LeagueInfo,
} from '@/api/superiorsix';
import { ApiError } from '@/api/errors';
import { useAuth } from '@/auth';
import { LoginForm } from '@/features/auth/LoginForm';
import { colors } from '@/theme';

import { DateScrubber } from './DateScrubber';
import { useFixturesTabMode } from './FixturesTabModeContext';
import { KickoffGroup } from './KickoffGroup';
import { utcDayKey } from './formatMatchDate';
import {
  distinctDayKeys,
  groupMatchesByKickoff,
  nextGameNumber,
  selectedMatchIds,
} from './matchGrouping';

const GAME_MASTER_ROLE = 'game-master';
const ADMIN_ROLE = 'admin';

/**
 * Admin match-day selection body for the fixtures tab.
 * Date scrubber + kickoff groups with add/drop toggles.
 */
export function MatchAdminWidget() {
  const { status, isAuthenticated, token, hasRole } = useAuth();
  const { setMode, setSelectedCount } = useFixturesTabMode();

  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [leagues, setLeagues] = useState<LeagueInfo[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyMatchId, setBusyMatchId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSelect =
    isAuthenticated && (hasRole(GAME_MASTER_ROLE) || hasRole(ADMIN_ROLE));

  const leaguesById = useMemo(() => {
    const map: Record<number, LeagueInfo> = {};
    for (const league of leagues) {
      map[league.id] = league;
    }
    return map;
  }, [leagues]);

  const dates = useMemo(() => distinctDayKeys(matches), [matches]);

  const groups = useMemo(() => {
    if (!selectedDate) {
      return [];
    }
    return groupMatchesByKickoff(matches, selectedDate, leaguesById);
  }, [matches, selectedDate, leaguesById]);

  const dayMatches = useMemo(() => {
    if (!selectedDate) {
      return [];
    }
    return matches.filter((match) => utcDayKey(match.match_date) === selectedDate);
  }, [matches, selectedDate]);

  const slots = useMemo(() => selectedMatchIds(dayMatches), [dayMatches]);
  const selectedCount = slots.filter((id) => id != null).length;

  useEffect(() => {
    setSelectedCount(selectedCount);
  }, [selectedCount, setSelectedCount]);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!token) {
        return;
      }
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      try {
        const [nextLeagues, nextMatches] = await Promise.all([
          listLeagues(token),
          listMatchesNew(token),
        ]);
        setLeagues(nextLeagues);
        setMatches(nextMatches);
        const dayKeys = distinctDayKeys(nextMatches);
        setSelectedDate((prev) => {
          if (prev && dayKeys.includes(prev)) {
            return prev;
          }
          // Prefer the soonest day that still has fixtures.
          return dayKeys[0] ?? null;
        });
        setExpanded((prev) => {
          // Expand the first kickoff group on first load only.
          if (Object.keys(prev).length > 0) {
            return prev;
          }
          const firstGroups = dayKeys[0]
            ? groupMatchesByKickoff(nextMatches, dayKeys[0], Object.fromEntries(
                nextLeagues.map((league) => [league.id, league]),
              ))
            : [];
          if (!firstGroups[0]) {
            return prev;
          }
          return { [firstGroups[0].key]: true };
        });
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Could not load matches for selection.';
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (status === 'loading' || !isAuthenticated || !token || !canSelect) {
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
  }, [status, isAuthenticated, token, canSelect, load]);

  const onToggleMatch = useCallback(
    async (match: AdminMatch) => {
      if (!token || busyMatchId != null) {
        return;
      }
      setBusyMatchId(match.id);
      setError(null);
      try {
        if (match.use_match) {
          const updated = await dropMatch(token, match.id);
          setMatches((prev) =>
            prev.map((row) => (row.id === updated.id ? updated : row)),
          );
        } else {
          const dayKey = utcDayKey(match.match_date);
          const daySlots = selectedMatchIds(
            matches.filter((row) => utcDayKey(row.match_date) === dayKey),
          );
          const gameNumber = nextGameNumber(daySlots);
          if (gameNumber == null) {
            setError('Six matches already selected. Drop one first.');
            return;
          }
          const updated = await addMatch(token, match.id, gameNumber);
          setMatches((prev) =>
            prev.map((row) => (row.id === updated.id ? updated : row)),
          );
        }
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Could not update match selection.';
        setError(message);
      } finally {
        setBusyMatchId(null);
      }
    },
    [token, busyMatchId, matches],
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
      <View style={styles.center}>
        <LoginForm heading="Admin sign in" />
      </View>
    );
  }

  if (!canSelect) {
    return (
      <View style={styles.center}>
        <View style={styles.wrap}>
          <Text style={styles.heading}>Game master required</Text>
          <Text style={styles.lede}>
            Match selection needs the superiorsix game-master (or admin) role.
          </Text>
          <Text
            accessibilityRole="link"
            onPress={() => setMode('normal')}
            style={styles.link}
          >
            Back to fixtures
          </Text>
        </View>
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
        <Text style={styles.kicker}>Match day</Text>
        <Text style={styles.banner}>
          {selectedCount} / 6 selections
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <DateScrubber
          dates={dates}
          selectedDate={selectedDate}
          onChange={(dayKey) => {
            setSelectedDate(dayKey);
          }}
        />
        {groups.length === 0 ? (
          <Text style={styles.empty}>
            No fixtures in the selection window. Ingest PL/ELC/EL1 matches via
            local-dev, then pull to refresh.
          </Text>
        ) : (
          groups.map((group) => (
            <KickoffGroup
              key={group.key}
              group={group}
              expanded={!!expanded[group.key]}
              onToggleExpand={() => {
                setExpanded((prev) => ({
                  ...prev,
                  [group.key]: !prev[group.key],
                }));
              }}
              busyMatchId={busyMatchId}
              selectionsFull={selectedCount >= 6}
              onToggleMatch={(match) => {
                void onToggleMatch(match);
              }}
            />
          ))
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
  kicker: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  banner: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  heading: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  lede: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  link: {
    color: colors.accentBright,
    fontSize: 15,
    fontWeight: '600',
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
});
