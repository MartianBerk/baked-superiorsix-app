import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  addMatches,
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
import { toLegacyDateParam, utcDayKey } from './formatMatchDate';
import {
  addToLowestSlot,
  distinctDayKeys,
  dropFromSlots,
  emptySlots,
  groupMatchesByKickoff,
  occupiedCount,
  selectedMatchIds,
  selectionsFromSlots,
  slotsEqual,
  type SelectionSlots,
} from './matchGrouping';

const GAME_MASTER_ROLE = 'game-master';
const ADMIN_ROLE = 'admin';

function savedSlotsForDay(
  matches: AdminMatch[],
  dayKey: string,
): SelectionSlots {
  const day = matches.filter((match) => utcDayKey(match.match_date) === dayKey);
  return selectedMatchIds(day);
}

/**
 * Admin match-day selection body for the fixtures tab.
 * Stable game-number slots (drop frees that number; next add takes lowest
 * free). Local draft + batch Submit preserves explicit slot numbers.
 */
export function MatchAdminWidget() {
  const { status, isAuthenticated, token, hasRole } = useAuth();
  const { setMode } = useFixturesTabMode();

  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [leagues, setLeagues] = useState<LeagueInfo[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  /** Slot index 0 → game_number 1 … index 5 → game_number 6. */
  const [draftSlots, setDraftSlots] = useState<SelectionSlots>(emptySlots);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  const displayMatches = useMemo(() => {
    if (!selectedDate) {
      return matches;
    }
    const slotById = new Map<number, number>();
    draftSlots.forEach((id, index) => {
      if (id != null) {
        slotById.set(id, index + 1);
      }
    });
    return matches.map((match) => {
      if (utcDayKey(match.match_date) !== selectedDate) {
        return match;
      }
      const gameNumber = slotById.get(match.id);
      if (gameNumber == null) {
        return { ...match, use_match: false, game_number: null };
      }
      return { ...match, use_match: true, game_number: gameNumber };
    });
  }, [matches, selectedDate, draftSlots]);

  const groups = useMemo(() => {
    if (!selectedDate) {
      return [];
    }
    return groupMatchesByKickoff(displayMatches, selectedDate, leaguesById);
  }, [displayMatches, selectedDate, leaguesById]);

  const selectedCount = occupiedCount(draftSlots);
  const savedSlots = useMemo(
    () => (selectedDate ? savedSlotsForDay(matches, selectedDate) : emptySlots()),
    [matches, selectedDate],
  );
  const dirty = !slotsEqual(draftSlots, savedSlots);
  const canSubmit = dirty && !submitting;

  const syncDraftForDate = useCallback(
    (dayKey: string | null, source: AdminMatch[]) => {
      if (!dayKey) {
        setDraftSlots(emptySlots());
        return;
      }
      setDraftSlots(savedSlotsForDay(source, dayKey));
    },
    [],
  );

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
          const next =
            prev && dayKeys.includes(prev) ? prev : (dayKeys[0] ?? null);
          syncDraftForDate(next, nextMatches);
          return next;
        });
        setExpanded((prev) => {
          if (Object.keys(prev).length > 0) {
            return prev;
          }
          const firstDay = dayKeys[0];
          const firstGroups = firstDay
            ? groupMatchesByKickoff(
                nextMatches,
                firstDay,
                Object.fromEntries(
                  nextLeagues.map((league) => [league.id, league]),
                ),
              )
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
    [token, syncDraftForDate],
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

  const onToggleMatch = useCallback((match: AdminMatch) => {
    setDraftSlots((prev) => {
      if (prev.includes(match.id)) {
        queueMicrotask(() => setError(null));
        return dropFromSlots(prev, match.id);
      }
      const next = addToLowestSlot(prev, match.id);
      if (next == null) {
        queueMicrotask(() =>
          setError('Six matches already selected. Drop one first.'),
        );
        return prev;
      }
      queueMicrotask(() => setError(null));
      return next;
    });
  }, []);

  const onSubmit = useCallback(async () => {
    if (!token || !selectedDate || !canSubmit) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = selectionsFromSlots(draftSlots);
      const updated = await addMatches(
        token,
        toLegacyDateParam(selectedDate),
        payload,
      );
      const updatedById = new Map(updated.map((row) => [row.id, row]));
      setMatches((prev) =>
        prev.map((row) => {
          if (utcDayKey(row.match_date) !== selectedDate) {
            return row;
          }
          const next = updatedById.get(row.id);
          if (next) {
            return next;
          }
          return { ...row, use_match: false, game_number: null };
        }),
      );
      setDraftSlots(selectedMatchIds(updated));
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Could not submit match selections.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }, [token, selectedDate, canSubmit, draftSlots]);

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
        <View style={styles.headerStrip}>
          <Text style={styles.headerLabel}>
            Match Day {selectedCount} / 6 selections
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Submit match selections"
            disabled={!canSubmit}
            onPress={() => {
              void onSubmit();
            }}
            style={({ pressed }) => [
              styles.submit,
              !canSubmit && styles.submitDisabled,
              pressed && canSubmit && styles.submitPressed,
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text style={styles.submitLabel}>Submit</Text>
            )}
          </Pressable>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <DateScrubber
          dates={dates}
          selectedDate={selectedDate}
          onChange={(dayKey) => {
            setSelectedDate(dayKey);
            syncDraftForDate(dayKey, matches);
            setError(null);
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
              busyMatchId={null}
              selectionsFull={selectedCount >= 6}
              onToggleMatch={onToggleMatch}
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
  submit: {
    minWidth: 88,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitPressed: {
    backgroundColor: colors.accentBright,
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
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
