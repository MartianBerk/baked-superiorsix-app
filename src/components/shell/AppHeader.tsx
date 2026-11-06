import { usePathname } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SuperiorSixLogo } from '@/components/icons/SuperiorSixLogo';
import { useLeadersTabMode } from '@/features/leaders/LeadersTabModeContext';
import { useFixturesTabMode } from '@/features/matches/FixturesTabModeContext';
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
   * Hidden in fixtures admin (count in widget) and leaders admin (round UI).
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

function isLeadersPath(pathname: string): boolean {
  return pathname.includes('/leaders');
}

/**
 * Top shell: round left, logo center, prize pot right,
 * plus thin round-status strip at the bottom of the header card.
 */
export function AppHeader({
  roundLabel = 'N',
  prizeLabel = '£X',
  roundStatus,
}: Props) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { mode: fixturesMode } = useFixturesTabMode();
  const { mode: leadersMode } = useLeadersTabMode();
  const { playerPickingStatus } = useRoundStatus();
  const hideStatusStrip =
    (fixturesMode === 'admin' && isFixturesPath(pathname)) ||
    (leadersMode === 'admin' && isLeadersPath(pathname));
  const status =
    roundStatus ??
    (isFixturesPath(pathname) &&
    fixturesMode === 'normal' &&
    playerPickingStatus
      ? playerPickingStatus
      : null) ??
    demoRoundStatusForPath(pathname);

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
            <Text style={styles.value}>{roundLabel}</Text>
          </View>

          <View style={styles.logoWrap} pointerEvents="none">
            <SuperiorSixLogo width={72} height={72} />
          </View>

          <View style={[styles.side, styles.sideRight]}>
            <Text style={styles.label}>Prize pot</Text>
            <Text style={styles.value}>{prizeLabel}</Text>
          </View>
        </View>

        {hideStatusStrip ? null : <RoundStatusStrip status={status} />}
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
