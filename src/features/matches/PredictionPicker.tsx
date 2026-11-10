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
}: Props) {
  const locked = disabled || busy;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {CHOICES.map(({ value, label }) => {
          const active = selection === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: locked }}
              accessibilityLabel={`Predict ${label}`}
              disabled={locked}
              onPress={() => onSelect(value)}
              style={({ pressed }) => [
                active
                  ? pickBadgeChrome.badgeSelection
                  : pickBadgeChrome.badgeSelectionIdle,
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
    </View>
  );
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
  buttonPressed: {
    backgroundColor: colors.surface,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});
