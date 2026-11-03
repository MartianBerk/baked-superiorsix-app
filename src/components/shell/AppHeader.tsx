import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SuperiorSixLogo } from '@/components/icons/SuperiorSixLogo';
import { colors } from '@/theme';

type Props = {
  /** Placeholder until round API is wired */
  roundLabel?: string;
  /** Placeholder until prize pot API is wired */
  prizeLabel?: string;
  /** Admin uses the red shield (legacy logo-admin). */
  logoVariant?: 'player' | 'admin';
};

/**
 * Top shell (legacy layout): round left, logo center, prize pot right.
 * Tournament entry points intentionally omitted (SS-8).
 */
export function AppHeader({
  roundLabel = 'N',
  prizeLabel = '£X',
  logoVariant = 'player',
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.side}>
        <Text style={styles.label}>Round</Text>
        <Text style={styles.value}>{roundLabel}</Text>
      </View>

      <View style={styles.logoWrap} pointerEvents="none">
        <SuperiorSixLogo variant={logoVariant} width={72} height={72} />
      </View>

      <View style={[styles.side, styles.sideRight]}>
        <Text style={styles.label}>Prize pot</Text>
        <Text style={styles.value}>{prizeLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingBottom: 12,
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
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
    paddingTop: 8,
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
