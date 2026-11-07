import { usePathname } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';
import { SuperiorSixLogo } from '@/components/icons/SuperiorSixLogo';
import { useLeadersTabMode } from '@/features/leaders/LeadersTabModeContext';
import { useFixturesTabMode } from '@/features/matches/FixturesTabModeContext';
import { useScoresTabMode } from '@/features/scores/ScoresTabModeContext';
import { colors } from '@/theme';

import { useRoundStatus } from './RoundStatusContext';
import { RoundStatusStrip } from './RoundStatusStrip';
import {
  demoRoundStatusForPath,
  type RoundStatus,
} from './roundStatus';

type Props = {
  /** Placeholder until round API is wired */
  roundLabel?: string;
  /** Placeholder until prize pot API is wired */
  prizeLabel?: string;
  /**
   * Thin status strip under the logo row.
   * Omit to use live player picking count on fixtures, else SS-8 tab demos
   * (Scores → live correct; Leaders → + rival all 6).
   * Hidden in fixtures / scores / leaders admin modes.
   */
  roundStatus?: RoundStatus;
};

function isFixturesPath(pathname: string): boolean {
  if (pathname.includes('/scores') || pathname.includes('/leaders')) {
    return false;
  }
  if (pathname.includes('/profile')) {
    return false;
  }
  return true;
}

function isScoresPath(pathname: string): boolean {
  return pathname.includes('/scores');
}

function isLeadersPath(pathname: string): boolean {
  return pathname.includes('/leaders');
}

/**
 * Top shell: round left, logo center, prize pot right,
 * plus thin round-status strip at the bottom of the header card.
 */
export function AppHeader({
  roundLabel,
  prizeLabel,
  roundStatus,
}: Props) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { mode: fixturesMode } = useFixturesTabMode();
  const { mode: scoresMode } = useScoresTabMode();
  const { mode: leadersMode } = useLeadersTabMode();
  const { playerPickingStatus, gamedayHeader } = useRoundStatus();
  const resolvedRound = roundLabel ?? gamedayHeader.roundLabel;
  const resolvedPrize = prizeLabel ?? gamedayHeader.prizeLabel;
  // Selections / correct strip is player-only; hide when logged out.
  const hideStatusStrip =
    !isAuthenticated ||
    (fixturesMode === 'admin' && isFixturesPath(pathname)) ||
    (scoresMode === 'admin' && isScoresPath(pathname)) ||
    (leadersMode === 'admin' && isLeadersPath(pathname));
  const status =
    roundStatus ??
    (fixturesMode === 'normal' &&
    isFixturesPath(pathname) &&
    playerPickingStatus
      ? playerPickingStatus
      : null) ??
    (scoresMode === 'normal' &&
    isScoresPath(pathname) &&
    playerPickingStatus
      ? playerPickingStatus
      : null) ??
    (isAuthenticated ? demoRoundStatusForPath(pathname) : null);
  const showPotBanner =
    isAuthenticated &&
    !hideStatusStrip &&
    status != null &&
    (status.correctCount ?? 0) === 6;
  return (
    <View
      style={[
        styles.outer,
        { paddingTop: Math.max(insets.top, 10) },
      ]}
    >
      <View style={styles.card}>
        <View style={styles.bar}>
          <View style={styles.side}>
            <Text style={styles.label}>Round</Text>
            <Text style={styles.value}>{resolvedRound}</Text>
          </View>

          <View style={styles.logoWrap} pointerEvents="none">
            <SuperiorSixLogo width={54} height={54} />
          </View>

          <View style={[styles.side, styles.sideRight]}>
            <Text style={styles.label}>Prize pot</Text>
            <Text style={styles.value}>{resolvedPrize}</Text>
          </View>
        </View>

        {showPotBanner ? (
          <View
            style={styles.potBanner}
            accessibilityRole="summary"
            accessibilityLabel="Six from six — on to win the pot"
          >
            <Text style={styles.potBannerText}>
              6/6 — on to win the pot
            </Text>
          </View>
        ) : null}

        {hideStatusStrip || status == null ? null : (
          <RoundStatusStrip status={status} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: '3%',
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  bar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  potBanner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.accent,
  },
  potBannerText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  side: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 2,
    zIndex: 1,
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  logoWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  value: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
});
