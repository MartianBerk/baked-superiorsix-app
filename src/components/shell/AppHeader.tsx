import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SuperiorSixLogo } from '@/components/icons/SuperiorSixLogo';
import { colors } from '@/theme';

import { RoundStatusStrip } from './RoundStatusStrip';
import {
  PLACEHOLDER_ROUND_STATUS,
  type RoundStatus,
} from './roundStatus';

type Props = {
  /** Placeholder until round API is wired */
  roundLabel?: string;
  /** Placeholder until prize pot API is wired */
  prizeLabel?: string;
  /** Thin status strip under the logo row (picking / live / finished). */
  roundStatus?: RoundStatus;
};

/**
 * Top shell: round left, logo center, prize pot right,
 * plus thin round-status strip at the bottom of the header card.
 */
export function AppHeader({
  roundLabel = 'N',
  prizeLabel = '£X',
  roundStatus = PLACEHOLDER_ROUND_STATUS,
}: Props) {
  const insets = useSafeAreaInsets();

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

        <RoundStatusStrip status={roundStatus} />
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
