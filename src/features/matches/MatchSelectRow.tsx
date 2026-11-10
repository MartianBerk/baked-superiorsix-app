import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import type { AdminMatch } from '@/api/superiorsix';
import { SelectionToggleIcon } from '@/components/icons/SelectionToggleIcon';
import { isPostponedStatus } from '@/features/scores/liveScoreDisplay';
import { colors } from '@/theme';

import { DifficultyPips } from './DifficultyPips';
import { MatchDetailPanel } from './MatchDetailPanel';

const CHEVRON_DOWN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
const CHEVRON_UP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`;

type Props = {
  match: AdminMatch;
  /** League catalog code (PL / ELC / …), shown above difficulty pips. */
  leagueCode?: string | null;
  busy: boolean;
  disabled: boolean;
  onToggle: (match: AdminMatch) => void;
};

/**
 * Fixture row: home above away (left); add/drop + expand/collapse
 * vertically centered on the right. Expand loads match detail.
 * Postponed fixtures show `(P)` and cannot be added to the slate
 * (already-selected postponed rows stay droppable).
 */
export function MatchSelectRow({
  match,
  leagueCode,
  busy,
  disabled,
  onToggle,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const selected = match.use_match;
  const postponed = isPostponedStatus(match.status);
  /** Cannot add postponed fixtures; drop remains available if already selected. */
  const selectionLocked = postponed && !selected;
  const toggleDisabled = busy || disabled || selectionLocked;
  const chevron = (expanded ? CHEVRON_UP : CHEVRON_DOWN).replaceAll(
    'CURRENT',
    colors.textMuted,
  );
  const teamStyle = [
    styles.team,
    selectionLocked && styles.teamLocked,
  ];

  return (
    <View
      style={[
        selected && styles.blockSelected,
        selectionLocked && styles.blockLocked,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.leagueAndPips}>
          {leagueCode ? (
            <Text style={styles.leagueCode} numberOfLines={1}>
              {leagueCode}
            </Text>
          ) : null}
          <DifficultyPips difficulty={match.difficulty} />
        </View>
        <View style={styles.teams}>
          <Text style={teamStyle} numberOfLines={1}>
            {match.home_team}
          </Text>
          <Text style={teamStyle} numberOfLines={1}>
            {match.away_team}
            {postponed ? (
              <Text style={styles.postponedMark}> (P)</Text>
            ) : null}
          </Text>
        </View>

        <View style={styles.actions}>
          {selected && match.game_number != null ? (
            <Text style={styles.slot}>#{match.game_number}</Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: toggleDisabled }}
            accessibilityLabel={
              postponed && !selected
                ? `Postponed — cannot add ${match.home_team} vs ${match.away_team}`
                : selected
                  ? `Drop ${match.home_team} vs ${match.away_team}`
                  : `Add ${match.home_team} vs ${match.away_team}`
            }
            disabled={toggleDisabled}
            onPress={() => onToggle(match)}
            style={({ pressed }) => [
              styles.actionHit,
              pressed && !toggleDisabled && styles.actionPressed,
              toggleDisabled && styles.actionDisabled,
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

      {expanded ? <MatchDetailPanel matchId={match.id} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  blockSelected: {
    backgroundColor: colors.menuActive,
  },
  /** Same muted wash as other locked/disabled selection chrome. */
  blockLocked: {
    opacity: 0.72,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  leagueAndPips: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 2,
    flexShrink: 0,
    minWidth: 28,
  },
  leagueCode: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
    lineHeight: 11,
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
  teamLocked: {
    color: colors.textMuted,
  },
  /** Legacy MatchSelector `.postponed` — muted red marker. */
  postponedMark: {
    color: colors.resultLose,
    fontWeight: '800',
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
