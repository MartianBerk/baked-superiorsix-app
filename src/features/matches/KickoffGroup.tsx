import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import type { AdminMatch } from '@/api/superiorsix';
import { colors } from '@/theme';

import { formatGroupHeader, type KickoffGroup as KickoffGroupModel } from './matchGrouping';
import { MatchSelectRow } from './MatchSelectRow';

const CHEVRON_DOWN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
const CHEVRON_UP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`;

type Props = {
  group: KickoffGroupModel;
  expanded: boolean;
  onToggleExpand: () => void;
  busyMatchId: number | null;
  selectionsFull: boolean;
  onToggleMatch: (match: AdminMatch) => void;
};

/** Kickoff-time group with league counts; tap header to expand/collapse. */
export function KickoffGroup({
  group,
  expanded,
  onToggleExpand,
  busyMatchId,
  selectionsFull,
  onToggleMatch,
}: Props) {
  const chevron = (expanded ? CHEVRON_UP : CHEVRON_DOWN).replaceAll(
    'CURRENT',
    colors.textMuted,
  );

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={formatGroupHeader(group)}
        onPress={onToggleExpand}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
      >
        <Text style={styles.headerText}>{formatGroupHeader(group)}</Text>
        <SvgXml xml={chevron} width={18} height={18} />
      </Pressable>
      {expanded
        ? group.matches.map((match) => {
            const selected = match.use_match;
            const disabled =
              match.status === 'POSTPONED'
                ? !selected
                : !selected && selectionsFull;
            return (
              <MatchSelectRow
                key={match.id}
                match={match}
                busy={busyMatchId === match.id}
                disabled={disabled}
                onToggle={onToggleMatch}
              />
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.menuBar,
  },
  headerPressed: {
    backgroundColor: colors.menuActive,
  },
  headerText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
