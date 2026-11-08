import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChevronIcon } from '@/components/icons/ChevronIcon';
import {
  SCRUBBER_CHEVRON_SIZE,
  scrubberChrome,
} from '@/features/matches/scrubberChrome';
import { colors } from '@/theme';

export type AdminPerformanceView = 'round' | 'side-games';

const VIEWS: AdminPerformanceView[] = ['round', 'side-games'];

type Props = {
  mode: AdminPerformanceView;
  onChange: (mode: AdminPerformanceView) => void;
};

function labelFor(mode: AdminPerformanceView): string {
  return mode === 'round' ? 'Round' : 'Side games';
}

/**
 * Admin Performance scrubber: Super Six round admin ↔ side-game activate.
 */
export function AdminPerformanceScrubber({ mode, onChange }: Props) {
  const index = VIEWS.indexOf(mode);
  const canLeft = index > 0;
  const canRight = index >= 0 && index < VIEWS.length - 1;

  return (
    <View
      style={[scrubberChrome.row, styles.row]}
      accessibilityRole="adjustable"
      accessibilityLabel={`${labelFor(mode)} admin`}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Show Round admin"
        disabled={!canLeft}
        onPress={() => {
          if (canLeft) {
            onChange(VIEWS[index - 1]);
          }
        }}
        style={({ pressed }) => [
          scrubberChrome.chevronHit,
          !canLeft && scrubberChrome.chevronDisabled,
          pressed && canLeft && scrubberChrome.pressed,
        ]}
      >
        {canLeft ? (
          <ChevronIcon direction="left" size={SCRUBBER_CHEVRON_SIZE} />
        ) : (
          <View style={scrubberChrome.chevronSpacer} />
        )}
      </Pressable>

      <Text style={styles.label}>{labelFor(mode)}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Show Side games admin"
        disabled={!canRight}
        onPress={() => {
          if (canRight) {
            onChange(VIEWS[index + 1]);
          }
        }}
        style={({ pressed }) => [
          scrubberChrome.chevronHit,
          !canRight && scrubberChrome.chevronDisabled,
          pressed && canRight && scrubberChrome.pressed,
        ]}
      >
        {canRight ? (
          <ChevronIcon direction="right" size={SCRUBBER_CHEVRON_SIZE} />
        ) : (
          <View style={scrubberChrome.chevronSpacer} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 0,
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
