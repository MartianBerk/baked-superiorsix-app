import { Text, View } from 'react-native';

import type { PredictionChoice } from '@/api/superiorsix';

import { pickBadgeChrome } from './pickBadgeChrome';
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
 * Shared H/D/A pick badge (Scores reference styling): lighter grey for the
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
        pickBadgeChrome.badge,
        compact && pickBadgeChrome.badgeCompact,
        correct && pickBadgeChrome.badgeCorrect,
      ]}
      accessibilityLabel={
        accessibilityLabel ??
        (correct ? `Correct pick ${label}` : `Pick ${label}`)
      }
    >
      <Text
        style={[
          pickBadgeChrome.badgeLabel,
          compact && pickBadgeChrome.badgeLabelCompact,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}
