import { Text, View } from 'react-native';

import type { PredictionChoice } from '@/api/superiorsix';

import { pickBadgeChrome } from './pickBadgeChrome';
import { PICK_BADGE_LABEL, PICK_SELECTION_LABEL } from './pickOutcome';

type Props = {
  prediction: PredictionChoice;
  correct: boolean;
  /** Optional a11y override; defaults to “Pick H/D/A” / “Correct pick …”. */
  accessibilityLabel?: string;
  /** Tighter 22px badge for collapsed Scores strip. */
  compact?: boolean;
  /**
   * `scores` (default): compact H/D/A (Scores + collapsed Matches row badge).
   * `selection`: full HOME/DRAW/AWAY (expanded pickers & side games).
   */
  variant?: 'scores' | 'selection';
};

/**
 * Shared H/D/A pick badge (Scores reference styling): lighter grey for the
 * selection, green when the pick matches the scoreline. No tick mark.
 */
export function PickOutcomeBadge({
  prediction,
  correct,
  accessibilityLabel,
  compact = false,
  variant = 'scores',
}: Props) {
  const label =
    variant === 'selection'
      ? PICK_SELECTION_LABEL[prediction]
      : PICK_BADGE_LABEL[prediction];
  const selection = variant === 'selection';
  return (
    <View
      style={[
        selection ? pickBadgeChrome.badgeSelection : pickBadgeChrome.badge,
        !selection && compact && pickBadgeChrome.badgeCompact,
        correct && pickBadgeChrome.badgeCorrect,
      ]}
      accessibilityLabel={
        accessibilityLabel ??
        (correct ? `Correct pick ${label}` : `Pick ${label}`)
      }
    >
      <Text
        style={[
          selection
            ? pickBadgeChrome.badgeSelectionLabel
            : pickBadgeChrome.badgeLabel,
          !selection && compact && pickBadgeChrome.badgeLabelCompact,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}
