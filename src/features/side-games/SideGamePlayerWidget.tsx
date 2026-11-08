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
  addSideGamePrediction,
  listSideGameMatches,
  listSideGamePredictions,
  listSideGameScores,
  type SideGameKind,
  type SideGameMatch,
  type SideGamePrediction,
  type SideGamePredictionChoice,
  type SideGameScoreRow,
} from '@/api/sideGames';
import { ApiError } from '@/api/errors';
import { useAuth } from '@/auth';
import { ChevronIcon } from '@/components/icons/ChevronIcon';
import { MenuIcon } from '@/components/icons/MenuIcon';
import { DateScrubber } from '@/features/matches/DateScrubber';
import { utcDayKey } from '@/features/matches/formatMatchDate';
import {
  SCRUBBER_CHEVRON_SIZE,
  scrubberChrome,
} from '@/features/matches/scrubberChrome';
import { formatPrizePounds } from '@/features/scores/gamedayHeader';
import { colors } from '@/theme';

import { SideGameMatchRow } from './SideGameMatchRow';
import { SideGameScoresTable } from './SideGameScoresTable';
import { useSideGamesOpen } from './SideGamesOpenContext';

type ViewMode = 'matches' | 'table';

const VIEWS: ViewMode[] = ['matches', 'table'];

type Props = {
  kind: SideGameKind;
};

type LocalPick = {
  prediction: SideGamePredictionChoice;
  extraTime: boolean;
  penalties: boolean;
};

function roleFor(kind: SideGameKind): string {
  return kind === 'euros' ? 'euros' : 'worldcup';
}

function titleFor(kind: SideGameKind): string {
  return kind === 'euros' ? 'Euros' : 'World Cup';
}

function teamColumnWidthFor(matches: SideGameMatch[]): number {
  let maxChars = 0;
  for (const match of matches) {
    maxChars = Math.max(
      maxChars,
      match.home_team.length,
      match.away_team.length + (match.status === 'POSTPONED' ? 4 : 0),
    );
  }
  return Math.min(160, Math.max(72, Math.ceil(maxChars * 7.2)));
}

function isMatchLocked(match: SideGameMatch, now: Date): boolean {
  const kickoff = new Date(match.match_date).getTime();
  if (!Number.isFinite(kickoff)) {
    return true;
  }
  return now.getTime() >= kickoff - 10 * 60 * 1000;
}

function pickInitialDay(dayKeys: string[], now: Date): string | null {
  if (dayKeys.length === 0) {
    return null;
  }
  const today = utcDayKey(now);
  if (dayKeys.includes(today)) {
    return today;
  }
  const future = dayKeys.find((d) => d >= today);
  return future ?? dayKeys[dayKeys.length - 1];
}

/**
 * Player Euros / World Cup surface: greyscale trophy + tournament pot on the
 * Matches ↔ Table scrubber row; date scrubber; inline H/D/A (+ knockout
 * 90/ET/P); scores board. App header stays on Super Six round / pot.
 */
export function SideGamePlayerWidget({ kind }: Props) {
  const { isAuthenticated, token, hasRole, session } = useAuth();
  const { eurosMeta, worldcupMeta, refresh: refreshOpen } = useSideGamesOpen();

  const [view, setView] = useState<ViewMode>('matches');
  const [matches, setMatches] = useState<SideGameMatch[]>([]);
  const [scores, setScores] = useState<SideGameScoreRow[]>([]);
  const [, setPredictions] = useState<SideGamePrediction[]>([]);
  const [localPicks, setLocalPicks] = useState<Record<number, LocalPick>>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyMatchId, setBusyMatchId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const canSubmit = isAuthenticated && hasRole(roleFor(kind));
  const authId = session?.userId ?? null;

  const potPence =
    kind === 'euros'
      ? (eurosMeta?.prize_pot_pence ?? 0)
      : (worldcupMeta?.pot_pence ?? 0);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      try {
        const [matchRows, scoreRows, predRows] = await Promise.all([
          listSideGameMatches(kind),
          listSideGameScores(kind, token),
          listSideGamePredictions(kind),
        ]);
        setMatches(matchRows);
        setScores(scoreRows);
        setPredictions(predRows);
        await refreshOpen();

        const fromMine: Record<number, LocalPick> = {};
        for (const pred of predRows) {
          if (authId && pred.auth_id === authId) {
            fromMine[pred.match_id] = {
              prediction: pred.prediction,
              extraTime: pred.extra_time,
              penalties: pred.penalties,
            };
          }
        }
        setLocalPicks((prev) => ({ ...fromMine, ...prev }));
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Could not load side-game data.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [kind, token, authId, refreshOpen],
  );

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        void load('initial');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const dayKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const match of matches) {
      if (match.match_date) {
        keys.add(utcDayKey(match.match_date));
      }
    }
    return [...keys].sort();
  }, [matches]);

  const effectiveDay = useMemo(() => {
    if (dayKeys.length === 0) {
      return null;
    }
    if (selectedDay && dayKeys.includes(selectedDay)) {
      return selectedDay;
    }
    return pickInitialDay(dayKeys, now);
  }, [dayKeys, selectedDay, now]);

  const dayMatches = useMemo(
    () =>
      matches.filter(
        (m) =>
          effectiveDay != null && utcDayKey(m.match_date) === effectiveDay,
      ),
    [matches, effectiveDay],
  );

  const teamColumnWidth = useMemo(
    () => teamColumnWidthFor(dayMatches),
    [dayMatches],
  );

  const selectionCount = useMemo(() => {
    let count = 0;
    for (const match of dayMatches) {
      if (localPicks[match.id]?.prediction) {
        count += 1;
      }
    }
    return count;
  }, [dayMatches, localPicks]);

  const selectionsComplete =
    dayMatches.length > 0 && selectionCount >= dayMatches.length;

  const submitPrediction = async (
    match: SideGameMatch,
    prediction: SideGamePredictionChoice,
    extraTime: boolean,
    penalties: boolean,
  ) => {
    if (!token || !canSubmit || busyMatchId != null) {
      return;
    }
    if (isMatchLocked(match, now)) {
      setError('Predictions lock 10 minutes before kickoff.');
      return;
    }
    if (prediction === 'draw' && (extraTime || penalties)) {
      setError('Draw cannot combine with extra time or penalties.');
      return;
    }
    setBusyMatchId(match.id);
    setError(null);
    try {
      const saved = await addSideGamePrediction(kind, token, {
        gameId: match.id,
        prediction,
        extraTime,
        penalties,
      });
      setLocalPicks((prev) => ({
        ...prev,
        [match.id]: {
          prediction: saved.prediction,
          extraTime: saved.extra_time,
          penalties: saved.penalties,
        },
      }));
      setPredictions((prev) => {
        const without = prev.filter(
          (p) => !(p.match_id === match.id && p.auth_id === saved.auth_id),
        );
        return [...without, saved];
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not save prediction.',
      );
    } finally {
      setBusyMatchId(null);
    }
  };

  const onSelect = (match: SideGameMatch, choice: SideGamePredictionChoice) => {
    void submitPrediction(match, choice, false, false);
  };

  const onCycleKnockout = (match: SideGameMatch) => {
    const current = localPicks[match.id];
    if (!current || current.prediction === 'draw') {
      return;
    }
    // Legacy cycle: neither → ET → pens → neither
    const nextExtra = !current.extraTime && !current.penalties;
    const nextPens = current.extraTime && !current.penalties;
    void submitPrediction(match, current.prediction, nextExtra, nextPens);
  };

  const viewIndex = VIEWS.indexOf(view);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textMuted} />
      </View>
    );
  }

  const potLabel = formatPrizePounds(potPence);

  return (
    <View style={styles.root}>
      <View style={styles.viewScrubberWrap}>
        <View style={styles.scrubberLine}>
          <View
            style={[scrubberChrome.row, styles.potChip]}
            accessibilityRole="summary"
            accessibilityLabel={`${titleFor(kind)} pot ${potLabel}`}
          >
            <MenuIcon
              name={kind === 'euros' ? 'euros' : 'worldcup'}
              size={20}
              color={colors.textMuted}
            />
            <Text style={styles.potLabel}>{potLabel}</Text>
          </View>

          <View
            style={[scrubberChrome.row, styles.viewScrubber]}
            accessibilityRole="adjustable"
            accessibilityLabel={`${titleFor(kind)} ${view}`}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show Matches"
              disabled={viewIndex <= 0}
              onPress={() => setView('matches')}
              style={({ pressed }) => [
                scrubberChrome.chevronHit,
                viewIndex <= 0 && scrubberChrome.chevronDisabled,
                pressed && viewIndex > 0 && scrubberChrome.pressed,
              ]}
            >
              {viewIndex > 0 ? (
                <ChevronIcon direction="left" size={SCRUBBER_CHEVRON_SIZE} />
              ) : (
                <View style={scrubberChrome.chevronSpacer} />
              )}
            </Pressable>
            <Text style={styles.viewLabel}>
              {view === 'matches' ? 'Matches' : 'Table'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show Table"
              disabled={viewIndex >= VIEWS.length - 1}
              onPress={() => setView('table')}
              style={({ pressed }) => [
                scrubberChrome.chevronHit,
                viewIndex >= VIEWS.length - 1 && scrubberChrome.chevronDisabled,
                pressed &&
                  viewIndex < VIEWS.length - 1 &&
                  scrubberChrome.pressed,
              ]}
            >
              {viewIndex < VIEWS.length - 1 ? (
                <ChevronIcon direction="right" size={SCRUBBER_CHEVRON_SIZE} />
              ) : (
                <View style={scrubberChrome.chevronSpacer} />
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {view === 'matches' ? (
        <>
          <View style={styles.dateScrubberWrap}>
            <DateScrubber
              dates={dayKeys}
              selectedDate={effectiveDay}
              onChange={setSelectedDay}
            />
          </View>
          {dayMatches.length > 0 ? (
            <Text
              style={[
                styles.selectionBanner,
                selectionsComplete && styles.selectionBannerComplete,
              ]}
            >
              {selectionsComplete
                ? 'Selections complete'
                : 'Missing selections'}
            </Text>
          ) : null}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
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
            {dayMatches.length === 0 ? (
              <Text style={styles.empty}>No matches for this day.</Text>
            ) : (
              dayMatches.map((match) => {
                const pick = localPicks[match.id];
                const locked = isMatchLocked(match, now);
                return (
                  <SideGameMatchRow
                    key={match.id}
                    match={match}
                    prediction={pick?.prediction ?? null}
                    extraTime={pick?.extraTime ?? false}
                    penalties={pick?.penalties ?? false}
                    busy={busyMatchId === match.id}
                    locked={locked}
                    canSubmit={canSubmit}
                    onPredict={(choice) => onSelect(match, choice)}
                    onCycleKnockout={() => onCycleKnockout(match)}
                    teamColumnWidth={teamColumnWidth}
                    now={now}
                  />
                );
              })
            )}
            {!canSubmit ? (
              <Text style={styles.readOnlyNote}>
                Anyone can browse {titleFor(kind)}. Submitting picks needs the{' '}
                {roleFor(kind)} role on the active roster.
              </Text>
            ) : null}
          </ScrollView>
        </>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
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
          <SideGameScoresTable scores={scores} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  viewScrubberWrap: {
    paddingHorizontal: '3%',
    marginBottom: 8,
  },
  /** Same 3% inset as AppHeader / Matches↔Table scrubber / Super Six screens. */
  dateScrubberWrap: {
    paddingHorizontal: '3%',
  },
  scrubberLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  /** Same bordered scrubber chip as Super Six `# n` / slate scrubber. */
  potChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexShrink: 0,
    marginBottom: 0,
    paddingHorizontal: 10,
    paddingVertical: 7.5,
  },
  potLabel: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  viewScrubber: {
    flex: 1,
    minWidth: 0,
    marginBottom: 0,
  },
  viewLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  error: {
    color: colors.resultLose,
    paddingHorizontal: '3%',
    marginBottom: 8,
    fontSize: 13,
  },
  selectionBanner: {
    textAlign: 'center',
    color: colors.amber,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  selectionBannerComplete: {
    color: colors.accentBright,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: '3%',
    paddingBottom: 40,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
  readOnlyNote: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 16,
    lineHeight: 18,
  },
});
