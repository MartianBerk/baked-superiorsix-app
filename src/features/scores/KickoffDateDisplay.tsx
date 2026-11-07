import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors } from '@/theme';

import {
  formatKickoffLabel,
  formatScrubberDate,
  utcDayKey,
} from '@/features/matches/formatMatchDate';
import { scrubberChrome } from '@/features/matches/scrubberChrome';

type Props = {
  /** ISO kickoff (usually subround `min_kickoff`). */
  kickoffIso: string | null | undefined;
  style?: StyleProp<ViewStyle>;
};

/** Display-only earliest-kickoff banner (`Sat 07 Nov 3pm`) — not navigable. */
export function KickoffDateDisplay({ kickoffIso, style }: Props) {
  if (!kickoffIso) {
    return null;
  }
  const label = `${formatScrubberDate(utcDayKey(kickoffIso))} ${formatKickoffLabel(kickoffIso)}`;

  return (
    <View
      style={[scrubberChrome.row, style]}
      accessibilityRole="text"
      accessibilityLabel={`Earliest kickoff ${label}`}
    >
      {/* Spacers match DateScrubber chevron slots so the label centres with the slate scrubber. */}
      <View style={scrubberChrome.chevronHit}>
        <View style={scrubberChrome.chevronSpacer} />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <View style={scrubberChrome.chevronHit}>
        <View style={scrubberChrome.chevronSpacer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
