import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChevronIcon } from '@/components/icons/ChevronIcon';
import { colors } from '@/theme';

import { formatScrubberDate } from './formatMatchDate';

type Props = {
  dates: string[];
  selectedDate: string | null;
  onChange: (dayKey: string) => void;
};

/** Left/right date scrubber through available match days. */
export function DateScrubber({ dates, selectedDate, onChange }: Props) {
  if (!selectedDate || dates.length === 0) {
    return null;
  }

  const index = dates.indexOf(selectedDate);
  const canLeft = index > 0;
  const canRight = index >= 0 && index < dates.length - 1;

  return (
    <View style={styles.row} accessibilityRole="adjustable">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous match date"
        disabled={!canLeft}
        onPress={() => {
          if (canLeft) {
            onChange(dates[index - 1]);
          }
        }}
        style={({ pressed }) => [
          styles.chevronHit,
          !canLeft && styles.chevronDisabled,
          pressed && canLeft && styles.pressed,
        ]}
      >
        {canLeft ? (
          <ChevronIcon direction="left" />
        ) : (
          <View style={styles.chevronSpacer} />
        )}
      </Pressable>

      <Text style={styles.dateLabel}>{formatScrubberDate(selectedDate)}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next match date"
        disabled={!canRight}
        onPress={() => {
          if (canRight) {
            onChange(dates[index + 1]);
          }
        }}
        style={({ pressed }) => [
          styles.chevronHit,
          !canRight && styles.chevronDisabled,
          pressed && canRight && styles.pressed,
        ]}
      >
        {canRight ? (
          <ChevronIcon direction="right" />
        ) : (
          <View style={styles.chevronSpacer} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chevronHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  chevronDisabled: {
    opacity: 0.35,
  },
  chevronSpacer: {
    width: 22,
    height: 22,
  },
  pressed: {
    backgroundColor: colors.menuActive,
  },
  dateLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
