import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { HistoricRound } from '@/api/superiorsix';
import { ChevronIcon } from '@/components/icons/ChevronIcon';
import {
  SCRUBBER_CHEVRON_SIZE,
  scrubberChrome,
} from '@/features/matches/scrubberChrome';
import { colors } from '@/theme';

import { formatJackpotPounds, formatWinnerDate } from './formatStats';

type Props = {
  rounds: HistoricRound[];
};

/**
 * Left/right scrubber through the full winners archive — one closed round at
 * a time, with winner name(s) and pot won.
 */
export function WinnersScrubber({ rounds }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (rounds.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Winners archive</Text>
        <Text style={styles.emptyBody}>No closed rounds yet.</Text>
      </View>
    );
  }

  const selected =
    rounds.find((row) => row.round_id === selectedId) ?? rounds[0];
  const index = rounds.findIndex((row) => row.round_id === selected.round_id);
  const canLeft = index < rounds.length - 1;
  const canRight = index > 0;
  const label = `Round ${selected.round_id}`;

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Round archive</Text>
      <View
        style={scrubberChrome.row}
        accessibilityRole="adjustable"
        accessibilityLabel={`${label}, won by ${selected.winner}, pot ${formatJackpotPounds(selected.jackpot)}`}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Older winner"
          disabled={!canLeft}
          onPress={() => {
            if (canLeft) {
              setSelectedId(rounds[index + 1].round_id);
            }
          }}
          style={({ pressed }) => [
            scrubberChrome.chevronHit,
            !canLeft && scrubberChrome.chevronDisabled,
            pressed && canLeft && scrubberChrome.pressed,
          ]}
        >
          {canLeft ? (
            <ChevronIcon direction="left" size={SCRUBBER_CHEVRON_SIZE} />
          ) : (
            <View style={scrubberChrome.chevronSpacer} />
          )}
        </Pressable>

        <Text style={styles.scrubLabel} numberOfLines={1}>
          {label}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Newer winner"
          disabled={!canRight}
          onPress={() => {
            if (canRight) {
              setSelectedId(rounds[index - 1].round_id);
            }
          }}
          style={({ pressed }) => [
            scrubberChrome.chevronHit,
            !canRight && scrubberChrome.chevronDisabled,
            pressed && canRight && scrubberChrome.pressed,
          ]}
        >
          {canRight ? (
            <ChevronIcon direction="right" size={SCRUBBER_CHEVRON_SIZE} />
          ) : (
            <View style={scrubberChrome.chevronSpacer} />
          )}
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.winner} numberOfLines={2}>
          {selected.winner}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            Won {formatWinnerDate(selected.end_date)}
          </Text>
          <Text style={styles.pot}>
            {formatJackpotPounds(selected.jackpot)}
          </Text>
        </View>
        <Text style={styles.detail}>
          {selected.players} players · {selected.matches} match days
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginLeft: 2,
  },
  scrubLabel: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  winner: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  meta: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  pot: {
    color: colors.amber,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  detail: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 16,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
