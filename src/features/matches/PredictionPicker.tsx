import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { PredictionChoice } from '@/api/superiorsix';
import { pickBadgeChrome } from '@/features/scores/pickBadgeChrome';
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
 * H / D / A badges for the expanded match-detail panel.
 * Selected / idle chrome matches Scores `PickOutcomeBadge` exactly.
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
                active ? pickBadgeChrome.badge : pickBadgeChrome.badgeIdle,
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
  buttonPressed: {
    backgroundColor: colors.surface,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});
