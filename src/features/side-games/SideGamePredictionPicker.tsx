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
  /**
   * When true, the selected badge / 90-ET-P control is green (correct).
   * When false/null, selection uses lighter grey only — no tick mark.
   */
  correct?: boolean | null;
  onSelect: (choice: SideGamePredictionChoice) => void;
  onCycleKnockout: () => void;
};

/**
 * Inline mid-row H / D / A badges (same chrome as admin prediction rows).
 * Knockout replaces D with a compact 90 → ET → P cycle control.
 * Selection = lighter grey; correct = green (no separate tick).
 */
export function SideGamePredictionPicker({
  selection,
  extraTime,
  penalties,
  knockout,
  busy,
  disabled,
  readOnly,
  correct = null,
  onSelect,
  onCycleKnockout,
}: Props) {
  const locked = disabled || busy || readOnly;
  const pickCorrect = correct === true;

  return (
    <View style={styles.picker}>
      {CHOICES.map(({ value, label }) => {
        if (knockout && value === 'draw') {
          const hasKnockoutPick =
            selection != null && selection !== 'draw';
          const cycleEnabled = !locked && hasKnockoutPick;
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
                hasKnockoutPick &&
                  !pickCorrect &&
                  styles.buttonSelected,
                hasKnockoutPick && pickCorrect && styles.buttonCorrect,
                pressed && cycleEnabled && styles.buttonPressed,
                // Dim only the empty control — keep selected/correct at full
                // contrast (same as Scores/Matches PickOutcomeBadge).
                locked && !hasKnockoutPick && styles.buttonMuted,
              ]}
            >
              <View style={styles.toggleRow}>
                <Text
                  style={[
                    styles.togglePart,
                    selection &&
                      !extraTime &&
                      !penalties &&
                      styles.toggleActive,
                  ]}
                >
                  90
                </Text>
                <Text
                  style={[
                    styles.togglePart,
                    selection &&
                      extraTime &&
                      !penalties &&
                      styles.toggleActive,
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
        const activeCorrect = active && pickCorrect;
        return (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled: locked }}
            accessibilityLabel={
              activeCorrect ? `Correct pick ${label}` : `Predict ${label}`
            }
            disabled={locked}
            onPress={() => onSelect(value)}
            style={({ pressed }) => [
              styles.button,
              styles.choiceButton,
              active && !activeCorrect && styles.buttonSelected,
              activeCorrect && styles.buttonCorrect,
              pressed && !locked && styles.buttonPressed,
              // Unselected only — selected grey / correct green stay full opacity.
              locked && !active && styles.buttonMuted,
            ]}
          >
            {busy && active ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text
                style={[
                  styles.label,
                  active && styles.labelSelected,
                  activeCorrect && styles.labelCorrect,
                ]}
              >
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
  /**
   * Shrink-wrap each row’s badge group and center it in the mid band.
   * Do not stretch to a shared width — that left-aligns H across mixed
   * knockout / group-stage rows on the same day.
   */
  picker: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flexShrink: 0,
  },
  button: {
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.menuBar,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** H / D / A stay fixed width. */
  choiceButton: {
    width: 36,
    flexGrow: 0,
    flexShrink: 0,
  },
  /** Wider middle control; H/A stay 36px — group remains centered as a unit. */
  knockoutButton: {
    width: 96,
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 8,
  },
  /**
   * Selected pick — same chrome as Scores/Matches `PickOutcomeBadge`
   * (`menuActive` + border + primary text).
   */
  buttonSelected: {
    backgroundColor: colors.menuActive,
    borderColor: colors.border,
  },
  /** Correct pick — same green as `PickOutcomeBadge`. */
  buttonCorrect: {
    backgroundColor: colors.accent,
    borderColor: colors.accentBright,
  },
  buttonPressed: {
    backgroundColor: colors.surface,
  },
  /** Unselected / empty when locked — do not fade the active badge. */
  buttonMuted: {
    opacity: 0.45,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  labelSelected: {
    color: colors.text,
  },
  labelCorrect: {
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
    color: colors.text,
  },
});
