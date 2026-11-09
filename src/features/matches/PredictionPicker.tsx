import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { PredictionChoice } from '@/api/superiorsix';
import { colors } from '@/theme';

const CHOICES: { value: PredictionChoice; label: string }[] = [
  { value: 'home', label: 'H' },
  { value: 'draw', label: 'D' },
  { value: 'away', label: 'A' },
];

type Props = {
  selection: PredictionChoice | null;
  busy: boolean;
  disabled: boolean;
  onSelect: (choice: PredictionChoice) => void;
};

/**
 * H / D / A badges for the expanded match-detail panel — same chrome as
 * tournament mid-row badges and admin prediction rows.
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
                styles.button,
                active && styles.buttonActive,
                pressed && !locked && styles.buttonPressed,
                locked && styles.buttonDisabled,
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
  /** Badges spaced across the middle ~33% of the expanded panel only. */
  row: {
    width: '33%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.menuBar,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Selected pick — lighter grey (correctness uses PickOutcomeBadge green). */
  buttonActive: {
    backgroundColor: colors.menuActive,
    borderColor: colors.border,
  },
  buttonPressed: {
    backgroundColor: colors.surface,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  labelActive: {
    color: colors.text,
  },
});
