import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChevronIcon } from '@/components/icons/ChevronIcon';
import {
  SCRUBBER_CHEVRON_SIZE,
  scrubberChrome,
} from '@/features/matches/scrubberChrome';
import { colors } from '@/theme';

export type StatsViewMode = 'stats' | 'winners';

const VIEWS: StatsViewMode[] = ['stats', 'winners'];

type Props = {
  mode: StatsViewMode;
  onChange: (mode: StatsViewMode) => void;
};

function labelFor(mode: StatsViewMode): string {
  return mode === 'stats' ? 'Performance' : 'Winners';
}

/**
 * Under-header scrubber: toggles Performance ↔ Winners (not round history).
 */
export function StatsViewScrubber({ mode, onChange }: Props) {
  const index = VIEWS.indexOf(mode);
  const canLeft = index > 0;
  const canRight = index >= 0 && index < VIEWS.length - 1;

  return (
    <View
      style={[scrubberChrome.row, styles.row]}
      accessibilityRole="adjustable"
      accessibilityLabel={`${labelFor(mode)} view`}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Show Performance"
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
        accessibilityLabel="Show Winners"
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
