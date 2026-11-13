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
  deleteSubround,
  openSubround,
  runAdminAutopick,
  type AdminMatch,
  type LeagueInfo,
  type Subround,
} from '@/api/superiorsix';
import { ApiError } from '@/api/errors';
import { useAuth } from '@/auth';
import { useRoundStatus } from '@/components/shell/RoundStatusContext';
import { LoginForm } from '@/features/auth/LoginForm';
import { isPostponedStatus } from '@/features/scores/liveScoreDisplay';
import { colors } from '@/theme';

import { loadAdminMatchesForScrubber } from './adminMatchLoad';
import { DateScrubber } from './DateScrubber';
import { SCRUBBER_ROW_TAIL_GAP } from './scrubberChrome';
import { useFixturesTabMode } from './FixturesTabModeContext';
import { KickoffGroup } from './KickoffGroup';
import {
  pickInitialAdminDay,
  toLegacyDateParam,
  utcDayKey,
} from './formatMatchDate';
import { aggregateSelectionDifficulty } from './matchDifficulty';
import {
  addToLowestSlot,
  adminScrubberDayKeys,
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
  const { setPlayerPickingStatus, refreshGameMeta } = useRoundStatus();
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
  const [autopicking, setAutopicking] = useState(false);
  const [openingSubround, setOpeningSubround] = useState(false);
  const [undoingSubround, setUndoingSubround] = useState(false);
  /** True until admin opens a parent Round via leaders → Admin (SS-84). */
  const [needsRound, setNeedsRound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Non-error Autopick feedback (picked / no-op). */
  const [notice, setNotice] = useState<string | null>(null);

  const canSelect = isAuthenticated && hasRole(ADMIN_ROLE);

  const selectedSubround = useMemo(
    () => subrounds.find((row) => row.id === selectedSubroundId) ?? null,
    [subrounds, selectedSubroundId],
  );

  /** Highest-sequence real subround (ignore pending virtual id=-1). */
  const latestRealSubround = useMemo(() => {
    for (let i = subrounds.length - 1; i >= 0; i -= 1) {
      const row = subrounds[i];
      if (!isPendingSubroundId(row.id)) {
        return row;
      }
    }
    return null;
  }, [subrounds]);

  /**
   * Right side preview shows “+” only on the latest real slate
   * (not older scrub, not pending id=-1).
   */
  const canStartNewSubround =
    latestRealSubround != null &&
    selectedSubroundId === latestRealSubround.id;

  /** Previous real slate under the latest (needed to undo an empty open). */
  const previousRealSubround = useMemo(() => {
    if (latestRealSubround == null) {
      return null;
    }
    const real = subrounds.filter((row) => !isPendingSubroundId(row.id));
    if (real.length < 2) {
      return null;
    }
    return real[real.length - 2] ?? null;
  }, [subrounds, latestRealSubround]);

  /**
   * Undo accidental `opensubround` when the new slate is still empty /
   * untouched (BE match_count 0; no local draft picks on the empty latest).
   * Shown only while scrubbed to the empty latest or the previous slate
   * (replaces the closed-subround help text there).
   */
  const canUndoNewSubround =
    latestRealSubround != null &&
    previousRealSubround != null &&
    latestRealSubround.match_count === 0 &&
    (selectedSubroundId === latestRealSubround.id ||
      selectedSubroundId === previousRealSubround.id) &&
    !(
      selectedSubroundId === latestRealSubround.id &&
      occupiedCount(draftSlots) > 0
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

  /** Only days that have fixtures — empty calendar days stay hidden; forward-cap applied on load. */
  const dates = useMemo(() => adminScrubberDayKeys(matches), [matches]);
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
      if (mode === 'initial') {
        setNotice(null);
      }
      try {
        if (mode === 'refresh') {
          await refreshGameMeta({ preserveChrome: true });
        }
        const loadNow = new Date();
        // Fixtures are round-agnostic. Parent Round is manual — do not call
        // listsubrounds until a round exists (avoids BE Round auto-create).
        const [nextLeagues, nextMatches, currentRound] = await Promise.all([
          listLeagues(token),
          loadAdminMatchesForScrubber(token, loadNow),
          getCurrentRound(token),
        ]);

        setLeagues(nextLeagues);
        setMatches(nextMatches);

        const dayKeys = adminScrubberDayKeys(nextMatches);
        setSelectedDate((prev) =>
          prev && dayKeys.includes(prev)
            ? prev
            : pickInitialAdminDay(dayKeys, loadNow),
        );
        setExpanded((prev) => {
          if (Object.keys(prev).length > 0) {
            return prev;
          }
          const firstDay = pickInitialAdminDay(dayKeys, loadNow);
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
    [token, selectedSubroundId, applySubroundSelection, refreshGameMeta],
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

  const onStartNewSubround = useCallback(async () => {
    if (!token || !canStartNewSubround || openingSubround || undoingSubround) {
      return;
    }
    setOpeningSubround(true);
    setError(null);
    try {
      const created = await openSubround(token);
      const refreshed = await listAdminSubrounds(token);
      const nextList = withPendingCurrent(refreshed, created.round_id);
      setSubrounds(nextList);
      const selected =
        nextList.find((row) => row.id === created.id) ?? created;
      applySubroundSelection(selected, matches);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Could not start a new subround.';
      setError(message);
    } finally {
      setOpeningSubround(false);
    }
  }, [
    token,
    canStartNewSubround,
    openingSubround,
    undoingSubround,
    matches,
    applySubroundSelection,
  ]);

  const onUndoNewSubround = useCallback(async () => {
    if (
      !token ||
      !canUndoNewSubround ||
      latestRealSubround == null ||
      undoingSubround ||
      openingSubround
    ) {
      return;
    }
    setUndoingSubround(true);
    setError(null);
    try {
      const restored = await deleteSubround(token, latestRealSubround.id);
      const refreshed = await listAdminSubrounds(token);
      const roundId =
        restored?.round_id ??
        refreshed[0]?.round_id ??
        previousRealSubround?.round_id ??
        null;
      const nextList =
        roundId != null ? withPendingCurrent(refreshed, roundId) : refreshed;
      setSubrounds(nextList);
      const selected =
        (restored != null
          ? (nextList.find((row) => row.id === restored.id) ?? restored)
          : null) ??
        nextList.find((row) => row.is_open_for_editing && !row.is_over) ??
        nextList[nextList.length - 1] ??
        null;
      if (selected) {
        applySubroundSelection(selected, matches);
      } else {
        setSelectedSubroundId(null);
        setDraftSlots(emptySlots());
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Could not undo the new subround.';
      setError(message);
    } finally {
      setUndoingSubround(false);
    }
  }, [
    token,
    canUndoNewSubround,
    latestRealSubround,
    previousRealSubround,
    undoingSubround,
    openingSubround,
    matches,
    applySubroundSelection,
  ]);

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
          // Drop always allowed — including postponed fixtures already on the slate.
          queueMicrotask(() => setError(null));
          return dropFromSlots(prev, match.id);
        }
        if (isPostponedStatus(match.status)) {
          queueMicrotask(() =>
            setError('Postponed matches cannot be added to the slate.'),
          );
          return prev;
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
      const postponedPick = selectionsFromSlots(draftSlots).find((item) => {
        const match = byId.get(item.id);
        return match != null && isPostponedStatus(match.status);
      });
      if (postponedPick != null) {
        setError('Drop postponed matches before submitting the slate.');
        setSubmitting(false);
        return;
      }

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

  // Reactive to draft: Autopick only while selectedCount === 0. Selecting any
  // match disables it; clearing the slate back to 0 re-enables (not a latch).
  const canAutopick =
    Boolean(token) &&
    Boolean(selectedDate) &&
    canEdit &&
    !needsRound &&
    selectedCount === 0 &&
    !submitting &&
    !autopicking &&
    !openingSubround &&
    !undoingSubround;

  const onAutopick = useCallback(async () => {
    if (!token || !selectedDate || !canAutopick) {
      return;
    }
    setAutopicking(true);
    setError(null);
    setNotice(null);
    try {
      // selectedDate is the admin UTC day key (YYYY-MM-DD) for the scrubber.
      const result = await runAdminAutopick(token, selectedDate);
      // 200 + noop is expected — toast message, not an error.
      setNotice(result.message);
      if (result.status === 'selected') {
        // Refresh draft slate / scrubber after a successful pick.
        await load('refresh');
      }
    } catch (err) {
      // Hard failures only (401/403/400/5xx / unreachable).
      const message =
        err instanceof ApiError
          ? err.message
          : 'Could not run Autopick.';
      setError(message);
    } finally {
      setAutopicking(false);
    }
  }, [token, selectedDate, canAutopick, load]);

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
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {needsRound ? (
          <Text style={styles.lede}>
            No round in progress. Tap Leaders again to open Admin and start a
            parent round, then return here to build the first selection slate.
            Fixtures still load below for browsing.
          </Text>
        ) : null}
        {canUndoNewSubround ? (
          <View style={styles.undoRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Undo new subround"
              disabled={undoingSubround || openingSubround}
              onPress={() => {
                void onUndoNewSubround();
              }}
              style={({ pressed }) => [
                styles.undoButton,
                (undoingSubround || openingSubround) && styles.undoDisabled,
                pressed &&
                  !undoingSubround &&
                  !openingSubround &&
                  styles.undoPressed,
              ]}
            >
              {undoingSubround ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text style={styles.undoLabel}>Undo new subround</Text>
              )}
            </Pressable>
          </View>
        ) : !needsRound &&
          !canEdit &&
          selectedSubround &&
          !isPendingSubroundId(selectedSubroundId) ? (
          <Text style={styles.lede}>
            Viewing a closed subround. Scrub to the current slate to edit
            selections.
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
                onStartNew={
                  canStartNewSubround
                    ? () => {
                        void onStartNewSubround();
                      }
                    : undefined
                }
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
              // 60% column: compact side slots leave room for the centre label;
              // full-width chip can use medium so date minis are not clipped.
              sideDensity={
                !needsRound &&
                subrounds.length > 0 &&
                selectedSubroundId != null
                  ? 'compact'
                  : 'medium'
              }
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
              leaguesById={leaguesById}
              onToggleMatch={onToggleMatch}
            />
          ))
        )}

        <View style={styles.footerStrip}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Autopick match selections"
            disabled={!canAutopick}
            onPress={() => {
              void onAutopick();
            }}
            style={({ pressed }) => [
              styles.autopick,
              !canAutopick && styles.autopickDisabled,
              pressed && canAutopick && styles.autopickPressed,
            ]}
          >
            {autopicking ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text style={styles.autopickLabel}>Autopick</Text>
            )}
          </Pressable>
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
    // Header already owns the top gap (AppHeader paddingBottom 12).
    paddingTop: 0,
  },
  footerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  /**
   * Sign-out profile styling (menuActive), not green Submit.
   * Sized to sit beside Submit in the footer strip.
   */
  autopick: {
    minWidth: 88,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.menuActive,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  autopickPressed: {
    opacity: 0.85,
  },
  autopickDisabled: {
    opacity: 0.4,
  },
  autopickLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  scrubberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    // Same 12px rhythm as header → scrubber (SCRUBBER_ROW_TAIL_GAP).
    marginBottom: SCRUBBER_ROW_TAIL_GAP,
  },
  /** Left subround scrubber — 40% of scrubber row. */
  subroundCol: {
    flexGrow: 2,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  /** Right date chip — 60% of scrubber row. */
  dateCol: {
    flexGrow: 3,
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
  undoRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  undoButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoPressed: {
    opacity: 0.85,
  },
  undoDisabled: {
    opacity: 0.4,
  },
  undoLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
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
  notice: {
    color: colors.amber,
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
