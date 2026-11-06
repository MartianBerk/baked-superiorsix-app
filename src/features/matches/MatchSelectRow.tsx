import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import type { AdminMatch } from '@/api/superiorsix';
import { SelectionToggleIcon } from '@/components/icons/SelectionToggleIcon';
import { colors } from '@/theme';

import { DifficultyPips } from './DifficultyPips';
import { MatchDetailPanel } from './MatchDetailPanel';

const CHEVRON_DOWN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
const CHEVRON_UP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`;

type Props = {
  match: AdminMatch;
  busy: boolean;
  disabled: boolean;
  onToggle: (match: AdminMatch) => void;
};

/**
 * Fixture row: home above away (left); add/drop + expand/collapse
 * vertically centered on the right. Expand loads match detail.
 */
export function MatchSelectRow({ match, busy, disabled, onToggle }: Props) {
  const [expanded, setExpanded] = useState(false);
  const selected = match.use_match;
  const postponed = match.status === 'POSTPONED';
  const chevron = (expanded ? CHEVRON_UP : CHEVRON_DOWN).replaceAll(
    'CURRENT',
    colors.textMuted,
  );

  return (
    <View style={[styles.block, selected && styles.blockSelected]}>
      <View style={styles.row}>
        <DifficultyPips difficulty={match.difficulty} />
        <View style={styles.teams}>
          <Text style={styles.team} numberOfLines={1}>
            {match.home_team}
          </Text>
          <Text style={styles.team} numberOfLines={1}>
            {match.away_team}
            {postponed ? ' (P)' : ''}
          </Text>
        </View>

        <View style={styles.actions}>
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
              styles.actionHit,
              pressed && styles.actionPressed,
              (busy || disabled) && styles.actionDisabled,
            ]}
          >
            {busy ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <SelectionToggleIcon selected={selected} size={22} />
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            accessibilityLabel={
              expanded
                ? `Collapse ${match.home_team} vs ${match.away_team}`
                : `Expand ${match.home_team} vs ${match.away_team}`
            }
            onPress={() => setExpanded((prev) => !prev)}
            style={({ pressed }) => [
              styles.actionHit,
              pressed && styles.actionPressed,
            ]}
          >
            <SvgXml xml={chevron} width={18} height={18} />
          </Pressable>
        </View>
      </View>

      {expanded ? (
        <MatchDetailPanel
          homeTeam={match.home_team}
          awayTeam={match.away_team}
          matchDateIso={match.match_date}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  blockSelected: {
    backgroundColor: colors.menuActive,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  teams: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    justifyContent: 'center',
  },
  team: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  slot: {
    color: colors.accentBright,
    fontSize: 11,
    fontWeight: '700',
    marginRight: 2,
    minWidth: 18,
    textAlign: 'right',
  },
  actionHit: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  actionPressed: {
    backgroundColor: colors.surface,
  },
  actionDisabled: {
    opacity: 0.45,
  },
});
