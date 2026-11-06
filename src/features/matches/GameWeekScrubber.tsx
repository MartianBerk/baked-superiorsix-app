import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChevronIcon } from '@/components/icons/ChevronIcon';
import { colors } from '@/theme';

import { formatScrubberDate } from './formatMatchDate';
import { SCRUBBER_CHEVRON_SIZE, scrubberChrome } from './scrubberChrome';

type Props = {
  /** Monday UTC day keys that have selected/available matches. */
  weeks: string[];
  selectedWeek: string | null;
  onChange: (mondayKey: string) => void;
};

/**
 * Left/right game-week scrubber (same chevron chrome as admin DateScrubber).
 * Only receives weeks that actually have matches; chevrons hide at the ends.
 * Centre label: G/W + commencing Monday — body text colour, not accent.
 */
export function GameWeekScrubber({ weeks, selectedWeek, onChange }: Props) {
  if (!selectedWeek || weeks.length === 0) {
    return null;
  }

  const index = weeks.indexOf(selectedWeek);
  const canLeft = index > 0;
  const canRight = index >= 0 && index < weeks.length - 1;

  return (
    <View style={scrubberChrome.row} accessibilityRole="adjustable">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous game week"
        disabled={!canLeft}
        onPress={() => {
          if (canLeft) {
            onChange(weeks[index - 1]);
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

      <View
        style={styles.label}
        accessibilityLabel={`Game week commencing ${formatScrubberDate(selectedWeek)}`}
      >
        <Text style={styles.gw}>G/W</Text>
        <View style={styles.divider} />
        <Text style={styles.date}>{formatScrubberDate(selectedWeek)}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next game week"
        disabled={!canRight}
        onPress={() => {
          if (canRight) {
            onChange(weeks[index + 1]);
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
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  gw: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  date: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
