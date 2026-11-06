import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import type { AdminMatch } from '@/api/superiorsix';
import { colors } from '@/theme';

import {
  formatGroupHeader,
  groupHeaderParts,
  type KickoffGroup as KickoffGroupModel,
} from './matchGrouping';
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
  const parts = groupHeaderParts(group);

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={formatGroupHeader(group)}
        onPress={onToggleExpand}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.part}>{parts.time}</Text>
          {parts.leagues ? (
            <Text style={styles.part}>{parts.leagues}</Text>
          ) : null}
        </View>
        {/* Count sits left of expand chevron — roughly over the add/drop column. */}
        <View style={styles.headerRight}>
          <Text style={styles.selectedCount}>{parts.selected}</Text>
          <View style={styles.chevronSlot}>
            <SvgXml xml={chevron} width={18} height={18} />
          </View>
        </View>
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
    // Match MatchSelectRow horizontal inset so the right cluster lines up.
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.menuBar,
  },
  headerPressed: {
    backgroundColor: colors.menuActive,
  },
  /** Time + leagues on the left. */
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 10,
    minWidth: 0,
  },
  /**
   * Selected count + expand chevron — mirrors MatchSelectRow `actions`
   * (toggle 36 + gap 14 + chevron 36).
   */
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexShrink: 0,
  },
  selectedCount: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
    minWidth: 36,
    textAlign: 'right',
  },
  chevronSlot: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  part: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
