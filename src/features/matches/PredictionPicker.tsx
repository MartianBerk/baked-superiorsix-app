import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { PredictionChoice } from '@/api/superiorsix';
import { colors } from '@/theme';

const CHOICES: { value: PredictionChoice; label: string }[] = [
  { value: 'home', label: 'Home' },
  { value: 'draw', label: 'Draw' },
  { value: 'away', label: 'Away' },
];

type Props = {
  selection: PredictionChoice | null;
  busy: boolean;
  disabled: boolean;
  onSelect: (choice: PredictionChoice) => void;
};

/**
 * Home / Draw / Away controls for the expanded match-detail panel.
 * Active selection uses the accent green (legacy GamePrediction).
 */
export function PredictionPicker({
  selection,
  busy,
  disabled,
  onSelect,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {CHOICES.map(({ value, label }) => {
          const active = selection === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: disabled || busy }}
              accessibilityLabel={`Predict ${label}`}
              disabled={disabled || busy}
              onPress={() => onSelect(value)}
              style={({ pressed }) => [
                styles.button,
                active && styles.buttonActive,
                pressed && !disabled && !busy && styles.buttonPressed,
                (disabled || busy) && styles.buttonDisabled,
              ]}
            >
              {busy && active ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text style={[styles.label, active && styles.labelActive]}>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  button: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    backgroundColor: colors.menuBar,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  buttonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accentBright,
  },
  buttonPressed: {
    backgroundColor: colors.menuActive,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  labelActive: {
    color: colors.text,
  },
});
