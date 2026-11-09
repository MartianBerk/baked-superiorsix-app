import { StyleSheet, Text, View } from 'react-native';

import type { PredictionChoice } from '@/api/superiorsix';
import { colors } from '@/theme';

import { PICK_BADGE_LABEL } from './pickOutcome';

type Props = {
  prediction: PredictionChoice;
  correct: boolean;
  /** Optional a11y override; defaults to “Pick H/D/A” / “Correct pick …”. */
  accessibilityLabel?: string;
  /** Tighter 22px badge for collapsed Scores strip. */
  compact?: boolean;
};

/**
 * Shared H/D/A pick badge (Matches + Scores): lighter grey for the
 * selection, green when the pick matches the scoreline. No tick mark.
 */
export function PickOutcomeBadge({
  prediction,
  correct,
  accessibilityLabel,
  compact = false,
}: Props) {
  const label = PICK_BADGE_LABEL[prediction];
  return (
    <View
      style={[
        styles.badge,
        compact && styles.badgeCompact,
        correct && styles.badgeCorrect,
      ]}
      accessibilityLabel={
        accessibilityLabel ??
        (correct ? `Correct pick ${label}` : `Pick ${label}`)
      }
    >
      <Text
        style={[
          styles.badgeLabel,
          compact && styles.badgeLabelCompact,
          correct && styles.badgeLabelCorrect,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 27,
    height: 27,
    borderRadius: 8,
    /** Lighter grey = selected pick (not yet / not correct). */
    backgroundColor: colors.menuActive,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeCompact: {
    width: 22,
    height: 22,
    borderRadius: 6,
  },
  badgeCorrect: {
    backgroundColor: colors.accent,
    borderColor: colors.accentBright,
  },
  badgeLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
    lineHeight: 14,
  },
  badgeLabelCompact: {
    fontSize: 11,
    lineHeight: 13,
  },
  badgeLabelCorrect: {
    color: colors.text,
  },
});
