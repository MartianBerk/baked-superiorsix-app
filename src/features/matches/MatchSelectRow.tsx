import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AdminMatch } from '@/api/superiorsix';
import { SelectionToggleIcon } from '@/components/icons/SelectionToggleIcon';
import { colors } from '@/theme';

type Props = {
  match: AdminMatch;
  busy: boolean;
  disabled: boolean;
  onToggle: (match: AdminMatch) => void;
};

/** Single fixture row with add/drop SVG toggle. */
export function MatchSelectRow({ match, busy, disabled, onToggle }: Props) {
  const selected = match.use_match;
  const postponed = match.status === 'POSTPONED';

  return (
    <View
      style={[styles.row, selected && styles.rowSelected]}
      accessibilityRole="summary"
    >
      <View style={styles.teams}>
        <Text style={styles.team} numberOfLines={1}>
          {match.home_team}
        </Text>
        <Text style={styles.vs}>v</Text>
        <Text style={[styles.team, styles.away]} numberOfLines={1}>
          {match.away_team}
        </Text>
      </View>
      {postponed ? <Text style={styles.postponed}>(P)</Text> : null}
      {selected && match.game_number != null ? (
        <Text style={styles.slot}>#{match.game_number}</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          selected
            ? `Drop ${match.home_team} vs ${match.away_team}`
            : `Add ${match.home_team} vs ${match.away_team}`
        }
        disabled={busy || disabled}
        onPress={() => onToggle(match)}
        style={({ pressed }) => [
          styles.toggle,
          pressed && styles.togglePressed,
          (busy || disabled) && styles.toggleDisabled,
        ]}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.textMuted} />
        ) : (
          <SelectionToggleIcon selected={selected} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowSelected: {
    backgroundColor: colors.menuActive,
  },
  teams: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  team: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  away: {
    textAlign: 'right',
  },
  vs: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  postponed: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  slot: {
    color: colors.accentBright,
    fontSize: 12,
    fontWeight: '700',
    minWidth: 22,
    textAlign: 'right',
  },
  toggle: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  togglePressed: {
    backgroundColor: colors.surface,
  },
  toggleDisabled: {
    opacity: 0.45,
  },
});
