import { StyleSheet, Text, View } from 'react-native';

import type { PredictionChoice } from '@/api/superiorsix';
import { colors } from '@/theme';

import { PICK_BADGE_LABEL } from './pickOutcome';

type Props = {
  prediction: PredictionChoice;
  correct: boolean;
  /** Optional a11y override; defaults to “Pick H/D/A” / “Correct pick …”. */
  accessibilityLabel?: string;
};

/**
 * Shared H/D/A pick badge (Matches + Scores): grey until scores decide,
 * green accent when the pick matches the scoreline.
 */
export function PickOutcomeBadge({
  prediction,
  correct,
  accessibilityLabel,
}: Props) {
  const label = PICK_BADGE_LABEL[prediction];
  return (
    <View
      style={[styles.badge, correct && styles.badgeCorrect]}
      accessibilityLabel={
        accessibilityLabel ??
        (correct ? `Correct pick ${label}` : `Pick ${label}`)
      }
    >
      <Text style={[styles.badgeLabel, correct && styles.badgeLabelCorrect]}>
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
    backgroundColor: colors.menuBar,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeCorrect: {
    backgroundColor: colors.accent,
    borderColor: colors.accentBright,
  },
  badgeLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
    lineHeight: 14,
  },
  badgeLabelCorrect: {
    color: colors.text,
  },
});
