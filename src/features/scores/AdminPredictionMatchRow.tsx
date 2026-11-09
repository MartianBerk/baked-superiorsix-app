import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { LiveMatch, PredictionChoice } from '@/api/superiorsix';
import { colors } from '@/theme';

import { pickBadgeChrome } from './pickBadgeChrome';

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
 * Badge chrome matches Scores `PickOutcomeBadge` exactly.
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
                active ? pickBadgeChrome.badge : pickBadgeChrome.badgeIdle,
                pressed && !locked && !busy && styles.buttonPressed,
                (locked || busy) && styles.buttonDisabled,
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
  buttonPressed: {
    backgroundColor: colors.surface,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});
