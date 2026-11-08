import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { SideGamePredictionChoice } from '@/api/sideGames';
import { colors } from '@/theme';

type Props = {
  selection: SideGamePredictionChoice | null;
  extraTime: boolean;
  penalties: boolean;
  /** Knockout (matchday ≥ 4): Draw becomes 90/ET/P cycle. */
  knockout: boolean;
  busy: boolean;
  disabled: boolean;
  readOnly: boolean;
  onSelect: (choice: SideGamePredictionChoice) => void;
  onCycleKnockout: () => void;
};

/**
 * Home / Draw|90-ET-P / Away — legacy Euros / World Cup prediction row.
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
    <View style={styles.wrap}>
      {readOnly ? (
        <Text style={styles.readOnlyHint}>
          View only — roster + euros/worldcup role required to submit.
        </Text>
      ) : null}
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: selection === 'home', disabled: locked }}
          accessibilityLabel="Predict home"
          disabled={locked}
          onPress={() => onSelect('home')}
          style={({ pressed }) => [
            styles.button,
            selection === 'home' && styles.buttonActive,
            pressed && !locked && styles.buttonPressed,
            locked && styles.buttonDisabled,
          ]}
        >
          {busy && selection === 'home' ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text
              style={[
                styles.label,
                selection === 'home' && styles.labelActive,
              ]}
            >
              Home
            </Text>
          )}
        </Pressable>

        {knockout ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cycle ninety minutes, extra time, penalties"
            disabled={locked || selection == null || selection === 'draw'}
            onPress={onCycleKnockout}
            style={({ pressed }) => [
              styles.button,
              styles.toggle,
              selection != null &&
                selection !== 'draw' &&
                styles.buttonActiveSoft,
              pressed && !locked && styles.buttonPressed,
              (locked || selection == null || selection === 'draw') &&
                styles.buttonDisabled,
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
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              selected: selection === 'draw',
              disabled: locked,
            }}
            accessibilityLabel="Predict draw"
            disabled={locked}
            onPress={() => onSelect('draw')}
            style={({ pressed }) => [
              styles.button,
              selection === 'draw' && styles.buttonActive,
              pressed && !locked && styles.buttonPressed,
              locked && styles.buttonDisabled,
            ]}
          >
            {busy && selection === 'draw' ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text
                style={[
                  styles.label,
                  selection === 'draw' && styles.labelActive,
                ]}
              >
                Draw
              </Text>
            )}
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: selection === 'away', disabled: locked }}
          accessibilityLabel="Predict away"
          disabled={locked}
          onPress={() => onSelect('away')}
          style={({ pressed }) => [
            styles.button,
            selection === 'away' && styles.buttonActive,
            pressed && !locked && styles.buttonPressed,
            locked && styles.buttonDisabled,
          ]}
        >
          {busy && selection === 'away' ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text
              style={[
                styles.label,
                selection === 'away' && styles.labelActive,
              ]}
            >
              Away
            </Text>
          )}
        </Pressable>
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
  readOnlyHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
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
  toggle: {
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  togglePart: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  toggleActive: {
    color: colors.accentBright,
  },
});
