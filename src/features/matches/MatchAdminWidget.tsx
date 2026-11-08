import { usePathname } from 'expo-router';
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
  getCurrentRound,
  getCurrentSubround,
  isNoRoundInProgressError,
  listAdminSubrounds,
  listLeagues,
  listMatches,
  type AdminMatch,
  type LeagueInfo,
  type Subround,
} from '@/api/superiorsix';
import { ApiError } from '@/api/errors';
import { useAuth } from '@/auth';
import { useRoundStatus } from '@/components/shell/RoundStatusContext';
import { LoginForm } from '@/features/auth/LoginForm';
import { colors } from '@/theme';

import { DateScrubber } from './DateScrubber';
import { useFixturesTabMode } from './FixturesTabModeContext';
import { KickoffGroup } from './KickoffGroup';
import {
  adminScrubberRange,
  toLegacyDateParam,
  utcDayKey,
} from './formatMatchDate';
import { aggregateSelectionDifficulty } from './matchDifficulty';
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
import { SubroundScrubber } from './SubroundScrubber';

const ADMIN_ROLE = 'admin';
/**
 * Target slate size for admin Matches.
 * Banner denominator is always this (e.g. 4/6 while picking).
 * Fewer than 6 is allowed on submit; selecting more than 6 is blocked.
 */
const MAX_SLOTS = 6;

/** Fixtures tab routes only — tabs keep this widget mounted off-tab. */
function isFixturesPath(pathname: string): boolean {
  if (
    pathname.includes('/scores') ||
    pathname.includes('/leaders') ||
    pathname.includes('/profile')
  ) {
    return false;
  }
  return true;
}
/**
 * Client-only id for the open “current” slate before BE creates it on Submit.
 * First / next subround is created by `addmatches`, not `currentsubround?create`.
 */
const PENDING_SUBROUND_ID = -1;

function matchById(matches: AdminMatch[]): Map<number, AdminMatch> {
  return new Map(matches.map((match) => [match.id, match]));
}

function isPendingSubroundId(id: number | null): boolean {
  return id === PENDING_SUBROUND_ID;
}

function makePendingSubround(roundId: number, sequence: number): Subround {
  return {
    id: PENDING_SUBROUND_ID,
    round_id: roundId,
    sequence,
    created_at: null,
    closed_at: null,
    match_count: 0,
    min_kickoff: null,
    max_kickoff: null,
    is_over: false,
    is_open_for_editing: true,
  };
}

/** Append a virtual current slate when round has no open-for-editing subround. */
function withPendingCurrent(
  listed: Subround[],
  roundId: number,
): Subround[] {
  const open = listed.find((row) => row.is_open_for_editing && !row.is_over);
  if (open) {
    return listed;
  }
  const nextSequence =
    listed.reduce((max, row) => Math.max(max, row.sequence), 0) + 1;
  return [...listed, makePendingSubround(roundId, nextSequence)];
}

function slotsForSubround(
  matches: AdminMatch[],
  subroundId: number | null,
): SelectionSlots {
  if (subroundId == null || isPendingSubroundId(subroundId)) {
    return emptySlots();
  }
  return selectedMatchIds(
    matches.filter(
      (match) => match.use_match && match.subround_id === subroundId,
    ),
  );
}

/**
 * Admin match selection: slots 1–6 per subround (sparse OK).
 * Subround scrubber above date scrubber; submit attaches via BE open slate.
 */
export function MatchAdminWidget() {
  const { status, isAuthenticated, token, hasRole } = useAuth();
  const { setMode } = useFixturesTabMode();
  const { setPlayerPickingStatus } = useRoundStatus();
  const pathname = usePathname();
  const ownsHeaderStrip = isFixturesPath(pathname);

  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [leagues, setLeagues] = useState<LeagueInfo[]>([]);
  const [subrounds, setSubrounds] = useState<Subround[]>([]);
  const [selectedSubroundId, setSelectedSubroundId] = useState<number | null>(
    null,
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  /** Slot index 0 → game_number 1 … index 5 → game_number 6 (any kickoff day). */
  const [draftSlots, setDraftSlots] = useState<SelectionSlots>(emptySlots);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  /** True until admin opens a parent Round via leaders → Admin (SS-84). */
  const [needsRound, setNeedsRound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSelect = isAuthenticated && hasRole(ADMIN_ROLE);

  const selectedSubround = useMemo(
    () => subrounds.find((row) => row.id === selectedSubroundId) ?? null,
    [subrounds, selectedSubroundId],
  );

  const canEdit =
    selectedSubround != null && selectedSubround.is_open_for_editing;

  const leaguesById = useMemo(() => {
    const map: Record<number, LeagueInfo> = {};
    for (const league of leagues) {
      map[league.id] = league;
    }
    return map;
  }, [leagues]);

  const dates = useMemo(() => distinctDayKeys(matches), [matches]);
  const byId = useMemo(() => matchById(matches), [matches]);

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
      // Other subrounds' selections stay selected on the server but must not
      // look selected while editing / viewing this slate.
      if (
        match.subround_id != null &&
        selectedSubroundId != null &&
        match.subround_id !== selectedSubroundId
      ) {
        return { ...match, use_match: false, game_number: null };
      }
      const gameNumber = slotById.get(match.id);
      if (gameNumber == null) {
        return { ...match, use_match: false, game_number: null };
      }
      return {
        ...match,
        use_match: true,
        game_number: gameNumber,
        subround_id: selectedSubroundId,
      };
    });
  }, [matches, selectedDate, draftSlots, selectedSubroundId]);

  const groups = useMemo(() => {
    if (!selectedDate) {
      return [];
    }
    return groupMatchesByKickoff(displayMatches, selectedDate, leaguesById);
  }, [displayMatches, selectedDate, leaguesById]);

  const selectedCount = occupiedCount(draftSlots);
  const selectedSlateDifficulty = useMemo(() => {
    const difficulties = draftSlots.map((id) =>
      id != null ? (byId.get(id)?.difficulty ?? null) : null,
    );
    return aggregateSelectionDifficulty(difficulties);
  }, [draftSlots, byId]);
  const savedSlots = useMemo(
    () => slotsForSubround(matches, selectedSubroundId),
    [matches, selectedSubroundId],
  );
  const dirty = canEdit && !slotsEqual(draftSlots, savedSlots);
  const canSubmit = dirty && !submitting;

  useEffect(() => {
    // Header strip: n/6 while this admin surface owns the fixtures tab.
    // Clear on leave/unmount so player Scores/Matches can republish submitted size.
    if (!isAuthenticated || !ownsHeaderStrip) {
      setPlayerPickingStatus(null);
      return;
    }
    setPlayerPickingStatus({
      phase: 'picking',
      slateSize: MAX_SLOTS,
      selectedCount,
      slateDifficulty: selectedSlateDifficulty,
    });
    return () => {
      setPlayerPickingStatus(null);
    };
  }, [
    isAuthenticated,
    ownsHeaderStrip,
    selectedCount,
    selectedSlateDifficulty,
    setPlayerPickingStatus,
  ]);

  const applySubroundSelection = useCallback(
    (next: Subround, allMatches: AdminMatch[]) => {
      setSelectedSubroundId(next.id);
      setDraftSlots(slotsForSubround(allMatches, next.id));
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
        const range = adminScrubberRange();
        // Fixtures are round-agnostic. Parent Round is manual — do not call
        // listsubrounds until a round exists (avoids BE Round auto-create).
        const [nextLeagues, nextMatches, currentRound] = await Promise.all([
          listLeagues(token),
          listMatches(token, range),
          getCurrentRound(token),
        ]);

        setLeagues(nextLeagues);
        setMatches(nextMatches);

        const dayKeys = distinctDayKeys(nextMatches);
        setSelectedDate((prev) =>
          prev && dayKeys.includes(prev) ? prev : (dayKeys[0] ?? null),
        );
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

        if (currentRound == null) {
          setNeedsRound(true);
          setSubrounds([]);
          setSelectedSubroundId(null);
          setDraftSlots(emptySlots());
          return;
        }

        setNeedsRound(false);
        let listed: Subround[] = [];
        let editing: Subround | null = null;
        try {
          // Never create=true here — first/next subround is created on Submit.
          const [listedRows, current] = await Promise.all([
            listAdminSubrounds(token),
            getCurrentSubround(token, { create: false }),
          ]);
          listed = listedRows;
          editing =
            current != null && !current.is_over
              ? current
              : (listed.find(
                  (row) => row.is_open_for_editing && !row.is_over,
                ) ?? null);
        } catch (err) {
          if (isNoRoundInProgressError(err)) {
            setNeedsRound(true);
            setSubrounds([]);
            setSelectedSubroundId(null);
            setDraftSlots(emptySlots());
            return;
          }
          throw err;
        }

        const nextSubrounds = withPendingCurrent(listed, currentRound.id);
        setSubrounds(nextSubrounds);

        const preferId = selectedSubroundId;
        const preferred =
          (preferId != null
            ? nextSubrounds.find((row) => row.id === preferId)
            : null) ??
          editing ??
          nextSubrounds[nextSubrounds.length - 1] ??
          null;
        if (preferred) {
          applySubroundSelection(preferred, nextMatches);
        } else {
          setSelectedSubroundId(null);
          setDraftSlots(emptySlots());
        }
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
    [token, selectedSubroundId, applySubroundSelection],
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on auth; refresh via pull
  }, [status, isAuthenticated, token, canSelect]);

  const onSelectSubround = useCallback(
    (next: Subround) => {
      applySubroundSelection(next, matches);
      setError(null);
    },
    [applySubroundSelection, matches],
  );

  const onToggleMatch = useCallback(
    (match: AdminMatch) => {
      if (!canEdit) {
        queueMicrotask(() =>
          setError(
            'This subround is closed. Scrub to the current slate to edit.',
          ),
        );
        return;
      }
      setDraftSlots((prev) => {
        if (prev.includes(match.id)) {
          queueMicrotask(() => setError(null));
          return dropFromSlots(prev, match.id);
        }
        // Hard cap at MAX_SLOTS — banner stays n/6; never allow a 7th pick.
        if (occupiedCount(prev) >= MAX_SLOTS) {
          queueMicrotask(() =>
            setError('All 6 selection slots are full. Drop one first.'),
          );
          return prev;
        }
        const next = addToLowestSlot(prev, match.id);
        if (next == null) {
          queueMicrotask(() =>
            setError('All 6 selection slots are full. Drop one first.'),
          );
          return prev;
        }
        queueMicrotask(() => setError(null));
        return next;
      });
    },
    [canEdit],
  );

  const onSubmit = useCallback(async () => {
    if (!token || !canSubmit || !canEdit) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const draftByDay = new Map<
        string,
        { id: number; game_number: number }[]
      >();
      for (const item of selectionsFromSlots(draftSlots)) {
        const match = byId.get(item.id);
        if (!match) {
          continue;
        }
        const dayKey = utcDayKey(match.match_date);
        const bucket = draftByDay.get(dayKey) ?? [];
        bucket.push(item);
        draftByDay.set(dayKey, bucket);
      }

      const savedByDay = new Map<string, number[]>();
      for (const match of matches) {
        if (
          !match.use_match ||
          match.subround_id !== selectedSubroundId
        ) {
          continue;
        }
        const dayKey = utcDayKey(match.match_date);
        const bucket = savedByDay.get(dayKey) ?? [];
        bucket.push(match.id);
        savedByDay.set(dayKey, bucket);
      }

      const daysToWrite = new Set<string>([
        ...draftByDay.keys(),
        ...savedByDay.keys(),
      ]);

      let nextMatches = matches;
      for (const dayKey of [...daysToWrite].sort()) {
        const payload = draftByDay.get(dayKey) ?? [];
        const updated = await addMatches(
          token,
          toLegacyDateParam(dayKey),
          payload,
        );
        const updatedById = new Map(updated.map((row) => [row.id, row]));
        nextMatches = nextMatches.map((row) => {
          if (utcDayKey(row.match_date) !== dayKey) {
            return row;
          }
          const next = updatedById.get(row.id);
          if (next) {
            return next;
          }
          // Cleared from this day's open slate.
          if (row.subround_id === selectedSubroundId) {
            return {
              ...row,
              use_match: false,
              game_number: null,
              subround_id: null,
            };
          }
          return row;
        });
      }
      setMatches(nextMatches);
      const refreshed = await listAdminSubrounds(token);
      const roundId =
        refreshed[0]?.round_id ??
        selectedSubround?.round_id ??
        null;
      const nextList =
        roundId != null ? withPendingCurrent(refreshed, roundId) : refreshed;
      setSubrounds(nextList);
      // After Submit, BE may have just created the pending slate — prefer the
      // real open-for-editing row over the client sentinel.
      const still =
        (!isPendingSubroundId(selectedSubroundId)
          ? nextList.find((row) => row.id === selectedSubroundId)
          : null) ??
        nextList.find((row) => row.is_open_for_editing && !row.is_over) ??
        nextList[nextList.length - 1] ??
        null;
      if (still) {
        applySubroundSelection(still, nextMatches);
      } else {
        setDraftSlots(slotsForSubround(nextMatches, selectedSubroundId));
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Could not submit match selections.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }, [
    token,
    canSubmit,
    canEdit,
    draftSlots,
    byId,
    matches,
    selectedSubroundId,
    selectedSubround,
    applySubroundSelection,
  ]);

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
        <LoginForm />
      </View>
    );
  }

  if (!canSelect) {
    return (
      <View style={styles.center}>
        <View style={styles.wrap}>
          <Text style={styles.heading}>Admin required</Text>
          <Text style={styles.lede}>
            Match selection needs the superiorsix admin role.
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
        {needsRound ? (
          <Text style={styles.lede}>
            No round in progress. Tap Leaders again to open Admin and start a
            parent round, then return here to build the first selection slate.
            Fixtures still load below for browsing.
          </Text>
        ) : null}
        {!needsRound &&
        !canEdit &&
        selectedSubround &&
        !isPendingSubroundId(selectedSubroundId) ? (
          <Text style={styles.lede}>
            Viewing a closed subround. Scrub to the current slate to edit
            selections.
          </Text>
        ) : null}
        {!needsRound && isPendingSubroundId(selectedSubroundId) ? (
          <Text style={styles.lede}>
            Current slate — pick matches and Submit. The subround is created on
            first submit.
          </Text>
        ) : null}
        <View style={styles.scrubberRow}>
          {!needsRound &&
          subrounds.length > 0 &&
          selectedSubroundId != null ? (
            <View style={styles.subroundCol}>
              <SubroundScrubber
                subrounds={subrounds}
                selectedId={selectedSubroundId}
                onChange={onSelectSubround}
                style={styles.scrubberFlush}
              />
            </View>
          ) : null}
          <View
            style={
              !needsRound &&
              subrounds.length > 0 &&
              selectedSubroundId != null
                ? styles.dateCol
                : styles.dateColFull
            }
          >
            <DateScrubber
              dates={dates}
              selectedDate={selectedDate}
              onChange={(dayKey) => {
                setSelectedDate(dayKey);
                setError(null);
              }}
              style={styles.scrubberFlush}
            />
          </View>
        </View>
        {groups.length === 0 ? (
          needsRound ? null : (
            <Text style={styles.empty}>
              No fixtures in the selection window. Ingest PL/ELC/EL1 matches via
              local-dev, then pull to refresh.
            </Text>
          )
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
              selectionsFull={selectedCount >= MAX_SLOTS}
              readOnly={needsRound || !canEdit}
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
    justifyContent: 'flex-end',
    gap: 12,
    marginBottom: 12,
  },
  scrubberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  /** ~33% — subround scrubber. */
  subroundCol: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  /** ~66% — date scrubber. */
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
