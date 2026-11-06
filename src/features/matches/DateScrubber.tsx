import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChevronIcon } from '@/components/icons/ChevronIcon';
import { colors } from '@/theme';

import { formatScrubberDate } from './formatMatchDate';
import { SCRUBBER_CHEVRON_SIZE, scrubberChrome } from './scrubberChrome';

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
    <View style={scrubberChrome.row} accessibilityRole="adjustable">
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
  dateLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
