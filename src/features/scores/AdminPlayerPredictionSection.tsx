import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import type { LiveMatch, PredictionChoice } from '@/api/superiorsix';
import { colors } from '@/theme';

import { AdminPredictionMatchRow } from './AdminPredictionMatchRow';

const CHEVRON_DOWN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
const CHEVRON_UP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`;

type Props = {
  playerName: string;
  matches: LiveMatch[];
  /** matchId → prediction for this player. */
  predictions: Record<number, PredictionChoice | null>;
  expanded: boolean;
  onToggleExpand: () => void;
  /** Match id currently saving for this player, if any. */
  busyMatchId: number | null;
  /** When true, H/D/A taps are disabled (e.g. no admin token). */
  disabled: boolean;
  onSelect: (match: LiveMatch, choice: PredictionChoice) => void;
};

/**
 * Expandable player section for admin predictions (matches KickoffGroup chrome).
 * Collapsed: name left, n/X right, chevron (X = current slate size).
 * Expanded: match rows with H/D/A (no per-match difficulty).
 * Slate difficulty lives in the under-header strip, not per player row.
 */
export function AdminPlayerPredictionSection({
  playerName,
  matches,
  predictions,
  expanded,
  onToggleExpand,
  busyMatchId,
  disabled,
  onSelect,
}: Props) {
  const chevron = (expanded ? CHEVRON_UP : CHEVRON_DOWN).replaceAll(
    'CURRENT',
    colors.textMuted,
  );
  let picked = 0;
  for (const match of matches) {
    if (predictions[match.id] != null) {
      picked += 1;
    }
  }
  const slateSize = matches.length > 0 ? matches.length : 6;
  const countLabel = `${picked}/${slateSize}`;

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${playerName}, ${countLabel} predictions`}
        onPress={onToggleExpand}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.name} numberOfLines={1}>
            {playerName}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.count}>{countLabel}</Text>
          <View style={styles.chevronSlot}>
            <SvgXml xml={chevron} width={18} height={18} />
          </View>
        </View>
      </Pressable>
      {expanded
        ? matches.map((match) => (
            <AdminPredictionMatchRow
              key={match.id}
              match={match}
              prediction={predictions[match.id] ?? null}
              busy={busyMatchId === match.id}
              disabled={disabled}
              onSelect={(choice) => onSelect(match, choice)}
            />
          ))
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.menuBar,
  },
  headerPressed: {
    backgroundColor: colors.menuActive,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexShrink: 0,
  },
  count: {
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
});
