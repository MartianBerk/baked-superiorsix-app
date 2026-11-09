import { router } from 'expo-router';
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
import { MenuIcon } from '@/components/icons/MenuIcon';
import { buildPlayerRoundStatus } from '@/components/shell/playerRoundStatus';
import { useRoundStatus } from '@/components/shell/RoundStatusContext';
import { DateScrubber } from '@/features/matches/DateScrubber';
import { utcDayKey } from '@/features/matches/formatMatchDate';
import { ScrubberSidePreview } from '@/features/matches/ScrubberSidePreview';
import { ScrubberSlidingText } from '@/features/matches/ScrubberSlidingText';
import {
  SCRUBBER_CHEVRON_SIZE,
  scrubberChrome,
} from '@/features/matches/scrubberChrome';
import type { ScrubDirection } from '@/features/matches/scrubberSlide';
import { formatPrizePounds } from '@/features/scores/gamedayHeader';
import { scoreListChrome } from '@/features/scores/scoreListChrome';
import { colors } from '@/theme';

import {
  isEurosMockEnabled,
  MOCK_EUROS_VIEWER_PICKS,
} from './eurosMock';
import { SideGameMatchRow } from './SideGameMatchRow';
import { SideGameScoresTable } from './SideGameScoresTable';
import { useSideGamesOpen } from './SideGamesOpenContext';

type ViewMode = 'matches' | 'table';

const VIEWS: ViewMode[] = ['matches', 'table'];

function viewLabel(mode: ViewMode): string {
  return mode === 'matches' ? 'Matches' : 'Table';
}

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
 * Player Euros / World Cup surface (shared `kind` — same chrome for both):
 * SVG+pot chip + Matches↔Table scrubber; date scrubber; inline H/D/A
 * (+ knockout 90/ET/P); scores board. App header keeps Super Six round/pot;
 * under-header strip shows tournament n / total Selections.
 */
export function SideGamePlayerWidget({ kind }: Props) {
  const { isAuthenticated, token, hasRole, session } = useAuth();
  const { setSideGamePickingStatus } = useRoundStatus();
  const { eurosMeta, worldcupMeta, refresh: refreshOpen } = useSideGamesOpen();

  const [view, setView] = useState<ViewMode>('matches');
  const [viewDirection, setViewDirection] = useState<ScrubDirection | null>(
    null,
  );
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
        // DEV mock: seed viewer picks (grey selections + one correct green).
        if (kind === 'euros' && isEurosMockEnabled()) {
          for (const [matchId, pick] of Object.entries(MOCK_EUROS_VIEWER_PICKS)) {
            fromMine[Number(matchId)] = {
              prediction: pick.prediction,
              extraTime: pick.extraTime,
              penalties: pick.penalties,
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

  /** All pickable fixtures across every date (denominator for under-header n/X). */
  const pickableMatches = useMemo(
    () => matches.filter((m) => m.status !== 'POSTPONED'),
    [matches],
  );

  const tournamentPickedCount = useMemo(() => {
    let count = 0;
    for (const match of pickableMatches) {
      if (localPicks[match.id]?.prediction) {
        count += 1;
      }
    }
    return count;
  }, [pickableMatches, localPicks]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSideGamePickingStatus(null);
      return;
    }
    // Dedicated channel — never write Super Six playerPickingStatus.
    setSideGamePickingStatus(
      buildPlayerRoundStatus({
        phase: 'picking',
        slateSize: pickableMatches.length,
        selectedCount: tournamentPickedCount,
        correctCount: 0,
        slateDifficulty: null,
      }),
    );
  }, [
    isAuthenticated,
    pickableMatches.length,
    tournamentPickedCount,
    setSideGamePickingStatus,
  ]);

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
  const canViewLeft = viewIndex > 0;
  const canViewRight = viewIndex >= 0 && viewIndex < VIEWS.length - 1;
  const leftViewLabel = canViewLeft ? viewLabel(VIEWS[viewIndex - 1]) : null;
  const rightViewLabel = canViewRight ? viewLabel(VIEWS[viewIndex + 1]) : null;

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
          <View style={styles.potCol}>
            <View
              style={[scrubberChrome.row, styles.potChip]}
              accessibilityRole="summary"
              accessibilityLabel={`${titleFor(kind)} pot ${potLabel}`}
            >
              <MenuIcon
                name={kind === 'euros' ? 'euros' : 'worldcup'}
                size={SCRUBBER_CHEVRON_SIZE}
                color={colors.text}
              />
              <Text style={styles.potLabel} numberOfLines={1}>
                {potLabel}
              </Text>
            </View>
          </View>

          <View style={styles.viewCol}>
            <View
              style={[scrubberChrome.row, styles.viewScrubber]}
              accessibilityRole="adjustable"
              accessibilityLabel={`${titleFor(kind)} ${viewLabel(view)}`}
            >
              <ScrubberSidePreview
                label={leftViewLabel}
                accessibilityLabel="Show Matches"
                disabled={!canViewLeft}
                direction={viewDirection}
                density="medium"
                onPress={() => {
                  if (!canViewLeft) {
                    return;
                  }
                  setViewDirection('left');
                  setView(VIEWS[viewIndex - 1]);
                }}
              />
              <View style={scrubberChrome.centerSlot}>
                <ScrubberSlidingText
                  label={viewLabel(view)}
                  direction={viewDirection}
                />
              </View>
              <ScrubberSidePreview
                label={rightViewLabel}
                accessibilityLabel="Show Table"
                disabled={!canViewRight}
                direction={viewDirection}
                density="medium"
                onPress={() => {
                  if (!canViewRight) {
                    return;
                  }
                  setViewDirection('right');
                  setView(VIEWS[viewIndex + 1]);
                }}
              />
            </View>
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
              sideDensity="wide"
              style={styles.scrubberFlush}
            />
          </View>
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
              <View style={scoreListChrome.sectionCard}>
                {dayMatches.map((match, index) => {
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
                      isFirst={index === 0}
                    />
                  );
                })}
              </View>
            )}
            {!isAuthenticated ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign in"
                onPress={() => {
                  router.push('/profile');
                }}
                style={({ pressed }) => [
                  styles.signInButton,
                  pressed && styles.signInButtonPressed,
                ]}
              >
                <Text style={styles.signInButtonLabel}>Sign in</Text>
              </Pressable>
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
    // Same 12px rhythm as MatchPlayerWidget scrubberRow.
    marginBottom: 12,
  },
  /** Same 3% inset as AppHeader / Super Six Matches scrubbers. */
  dateScrubberWrap: {
    paddingHorizontal: '3%',
    marginBottom: 12,
  },
  scrubberLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  /** Left tournament SVG+pot — ~33% (same as Super Six Matches/Scores slate chip). */
  potCol: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  /** Right Matches↔Table scrubber — ~66%. */
  viewCol: {
    flexGrow: 2,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  scrubberFlush: {
    marginBottom: 0,
  },
  /**
   * Same bordered scrubber chip metrics as Super Six `# n` / date chips
   * (scrubberChrome.row padding 8 / 7.5 + chevron-hit height).
   */
  potChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 0,
    minHeight: 7.5 * 2 + 33,
  },
  potLabel: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  viewScrubber: {
    marginBottom: 0,
  },
  error: {
    color: colors.resultLose,
    paddingHorizontal: '3%',
    marginBottom: 8,
    fontSize: 13,
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
  /** Guest Sign in — right-aligned (routes to profile/login). */
  signInButton: {
    alignSelf: 'flex-end',
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.menuActive,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  signInButtonPressed: {
    opacity: 0.85,
  },
  signInButtonLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
