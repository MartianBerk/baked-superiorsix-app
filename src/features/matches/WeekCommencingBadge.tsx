import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

import { formatScrubberDate } from './formatMatchDate';

type Props = {
  /** UTC day key `YYYY-MM-DD` — earliest selected/available match day. */
  dayKey: string | null;
};

/**
 * Week-commencing graphic for the player fixtures tab.
 * Replaces legacy per-match date/time at the top of the list.
 */
export function WeekCommencingBadge({ dayKey }: Props) {
  if (!dayKey) {
    return null;
  }

  return (
    <View
      style={styles.badge}
      accessibilityRole="summary"
      accessibilityLabel={`Week commencing ${formatScrubberDate(dayKey)}`}
    >
      <Text style={styles.wc}>W/C</Text>
      <View style={styles.divider} />
      <Text style={styles.date}>{formatScrubberDate(dayKey)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  wc: {
    color: colors.accentBright,
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
