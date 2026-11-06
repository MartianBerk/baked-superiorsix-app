import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChevronIcon } from '@/components/icons/ChevronIcon';
import { colors } from '@/theme';

import { formatScrubberDate } from './formatMatchDate';

type Props = {
  /** Monday UTC day keys available to scrub. */
  weeks: string[];
  selectedWeek: string | null;
  onChange: (mondayKey: string) => void;
};

/**
 * Left/right game-week scrubber (same chevron pattern as admin DateScrubber).
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
    <View style={styles.row} accessibilityRole="adjustable">
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
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  gw: {
    color: colors.text,
    fontSize: 15,
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
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
