import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { SideGamePredictionChoice } from '@/api/sideGames';
import { colors } from '@/theme';

const CHOICES: { value: SideGamePredictionChoice; label: string }[] = [
  { value: 'home', label: 'H' },
  { value: 'draw', label: 'D' },
  { value: 'away', label: 'A' },
];

type Props = {
  selection: SideGamePredictionChoice | null;
  extraTime: boolean;
  penalties: boolean;
  /** Knockout (matchday ≥ 4): middle control is 90/ET/P instead of D. */
  knockout: boolean;
  busy: boolean;
  disabled: boolean;
  readOnly: boolean;
  onSelect: (choice: SideGamePredictionChoice) => void;
  onCycleKnockout: () => void;
};

/**
 * Inline mid-row H / D / A badges (same chrome as admin prediction rows).
 * Knockout replaces D with a compact 90 → ET → P cycle control.
 */
export function SideGamePredictionPicker({
  selection,
  extraTime,
  penalties,
  knockout,
  busy,
  disabled,
  readOnly,
  onSelect,
  onCycleKnockout,
}: Props) {
  const locked = disabled || busy || readOnly;

  return (
    <View style={styles.picker}>
      {CHOICES.map(({ value, label }) => {
        if (knockout && value === 'draw') {
          const cycleEnabled =
            !locked && selection != null && selection !== 'draw';
          return (
            <Pressable
              key="knockout-cycle"
              accessibilityRole="button"
              accessibilityLabel="Cycle ninety minutes, extra time, penalties"
              disabled={!cycleEnabled}
              onPress={onCycleKnockout}
              style={({ pressed }) => [
                styles.button,
                styles.knockoutButton,
                selection != null &&
                  selection !== 'draw' &&
                  styles.buttonActiveSoft,
                pressed && cycleEnabled && styles.buttonPressed,
                !cycleEnabled && styles.buttonDisabled,
              ]}
            >
              <View style={styles.toggleRow}>
                <Text
                  style={[
                    styles.togglePart,
                    selection && !extraTime && !penalties && styles.toggleActive,
                  ]}
                >
                  90
                </Text>
                <Text
                  style={[
                    styles.togglePart,
                    selection && extraTime && !penalties && styles.toggleActive,
                  ]}
                >
                  ET
                </Text>
                <Text
                  style={[
                    styles.togglePart,
                    selection && penalties && styles.toggleActive,
                  ]}
                >
                  P
                </Text>
              </View>
            </Pressable>
          );
        }

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
  );
}

const styles = StyleSheet.create({
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
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
  knockoutButton: {
    width: 72,
    paddingHorizontal: 4,
  },
  buttonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accentBright,
  },
  buttonActiveSoft: {
    borderColor: colors.accentBright,
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  togglePart: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  toggleActive: {
    color: colors.accentBright,
  },
});
