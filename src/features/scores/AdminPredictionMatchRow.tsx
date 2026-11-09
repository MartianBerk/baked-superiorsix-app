import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { LiveMatch, PredictionChoice } from '@/api/superiorsix';
import { colors } from '@/theme';

const CHOICES: { value: PredictionChoice; label: string }[] = [
  { value: 'home', label: 'H' },
  { value: 'draw', label: 'D' },
  { value: 'away', label: 'A' },
];

type Props = {
  match: LiveMatch;
  prediction: PredictionChoice | null;
  busy: boolean;
  disabled: boolean;
  onSelect: (choice: PredictionChoice) => void;
};

/**
 * Expanded admin prediction row: Home | H D A | Away.
 * Tap submits that pick for the player (admin-on-behalf).
 */
export function AdminPredictionMatchRow({
  match,
  prediction,
  busy,
  disabled,
  onSelect,
}: Props) {
  const postponed = match.status === 'POSTPONED';
  const locked = disabled || postponed;

  return (
    <View style={[styles.row, prediction != null && styles.rowPicked]}>
      <Text style={[styles.team, styles.teamHome]} numberOfLines={2}>
        {match.home_team}
      </Text>
      <View style={styles.picker}>
        {CHOICES.map(({ value, label }) => {
          const active = prediction === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{
                selected: active,
                disabled: locked || busy,
              }}
              accessibilityLabel={`Predict ${label} for ${match.home_team} vs ${match.away_team}`}
              disabled={locked || busy}
              onPress={() => onSelect(value)}
              style={({ pressed }) => [
                styles.button,
                active && styles.buttonActive,
                pressed && !locked && !busy && styles.buttonPressed,
                (locked || busy) && styles.buttonDisabled,
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
      <Text style={[styles.team, styles.teamAway]} numberOfLines={2}>
        {match.away_team}
        {postponed ? ' (P)' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowPicked: {
    backgroundColor: colors.menuActive,
  },
  team: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  teamHome: {
    textAlign: 'left',
  },
  teamAway: {
    textAlign: 'right',
  },
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
  /** Selected pick — lighter grey (same as player PredictionPicker). */
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
