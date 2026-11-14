import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { PredictionChoice } from '@/api/superiorsix';
import {
  pickBadgeChrome,
  pickBadgeSelectionRowGap,
} from '@/features/scores/pickBadgeChrome';
import { PICK_SELECTION_LABEL } from '@/features/scores/pickOutcome';
import { colors } from '@/theme';

const CHOICES: { value: PredictionChoice; label: string }[] = (
  ['home', 'draw', 'away'] as const
).map((value) => ({ value, label: PICK_SELECTION_LABEL[value] }));

type Props = {
  selection: PredictionChoice | null;
  busy: boolean;
  disabled: boolean;
  onSelect: (choice: PredictionChoice) => void;
  /** Inline row (e.g. Scores admin); omit match-detail panel top rule. */
  embedded?: boolean;
  /** `${home} vs ${away}` for richer accessibility labels. */
  fixtureLabel?: string;
  postponed?: boolean;
  /**
   * When true, the active choice uses correct-green badge chrome
   * (Scores admin chosen pick). Default keeps lighter grey selection.
   */
  selectedGreen?: boolean;
};

/**
 * HOME / DRAW / AWAY badges for the expanded match-detail panel.
 * Chrome matches selection badges elsewhere (lighter grey idle, shared radius).
 */
export function PredictionPicker({
  selection,
  busy,
  disabled,
  onSelect,
  embedded = false,
  fixtureLabel,
  postponed = false,
  selectedGreen = false,
}: Props) {
  const locked = disabled || busy;

  const choiceA11y = (label: string) => {
    if (postponed && fixtureLabel) {
      return `Postponed — cannot predict ${fixtureLabel}`;
    }
    if (fixtureLabel) {
      return `Predict ${label} for ${fixtureLabel}`;
    }
    return `Predict ${label}`;
  };

  const picker = (
    <View style={[styles.row, embedded && styles.rowEmbedded]}>
      {CHOICES.map(({ value, label }) => {
        const active = selection === value;
        const activeGreen = active && selectedGreen;
        return (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled: locked }}
            accessibilityLabel={choiceA11y(label)}
            disabled={locked}
            onPress={() => onSelect(value)}
            style={({ pressed }) => [
              active
                ? pickBadgeChrome.badgeSelection
                : pickBadgeChrome.badgeSelectionIdle,
              activeGreen && pickBadgeChrome.badgeCorrect,
              pressed && !locked && styles.buttonPressed,
              locked && styles.buttonDisabled,
            ]}
          >
            {busy && active ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text
                style={
                  active
                    ? pickBadgeChrome.badgeSelectionLabel
                    : pickBadgeChrome.badgeSelectionLabelIdle
                }
              >
                {label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );

  if (embedded) {
    return picker;
  }

  return <View style={styles.wrap}>{picker}</View>;
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  row: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: pickBadgeSelectionRowGap,
    flexWrap: 'wrap',
  },
  rowEmbedded: {
    alignSelf: 'auto',
    flexShrink: 0,
  },
  buttonPressed: {
    backgroundColor: colors.surface,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});
