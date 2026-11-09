import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { SideGamePredictionChoice } from '@/api/sideGames';
import { PickOutcomeBadge } from '@/features/scores/PickOutcomeBadge';
import { pickBadgeChrome } from '@/features/scores/pickBadgeChrome';
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
 * Inline mid-row H / D / A (or knockout 90/ET/P).
 * Selected / correct badges are Scores `PickOutcomeBadge` (no locked opacity).
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
                hasKnockoutPick && !pickCorrect
                  ? pickBadgeChrome.badge
                  : null,
                hasKnockoutPick && pickCorrect
                  ? [pickBadgeChrome.badge, pickBadgeChrome.badgeCorrect]
                  : null,
                !hasKnockoutPick ? pickBadgeChrome.badgeIdle : null,
                // Width after chrome so 90/ET/P stays wider than H/D/A.
                styles.knockoutButton,
                pressed && cycleEnabled && styles.buttonPressed,
                // Never fade a selected/correct knockout control.
                locked && !hasKnockoutPick && styles.idleMuted,
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

        // Locked selected pick → literal Scores badge (no Pressable fade).
        if (locked && active) {
          return (
            <PickOutcomeBadge
              key={value}
              prediction={value}
              correct={activeCorrect}
              accessibilityLabel={
                activeCorrect ? `Correct pick ${label}` : `Pick ${label}`
              }
            />
          );
        }

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
                ? pickBadgeChrome.badge
                : pickBadgeChrome.badgeIdle,
              activeCorrect && pickBadgeChrome.badgeCorrect,
              pressed && !locked && styles.buttonPressed,
              // Idle only — selected never gets opacity (matches PickOutcomeBadge).
              locked && !active && styles.idleMuted,
            ]}
          >
            {busy && active ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text
                style={
                  active
                    ? pickBadgeChrome.badgeLabel
                    : pickBadgeChrome.badgeLabelIdle
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
  /**
   * Wider middle control; height/radius/fill come from `pickBadgeChrome`
   * so selected/correct match Scores H/D/A badges.
   */
  knockoutButton: {
    width: 84,
    paddingHorizontal: 6,
  },
  buttonPressed: {
    backgroundColor: colors.surface,
  },
  idleMuted: {
    opacity: 0.45,
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
