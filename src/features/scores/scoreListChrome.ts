import { StyleSheet } from 'react-native';

import { colors } from '@/theme';

/**
 * Scores player-list chrome (`PlayerScoreSection` card + `ScoreMatchRow`).
 * Matches slate card / rows and Euros/WC day lists reuse these tokens so
 * section borders, spacing, picked wash, and team type match Scores.
 */
export const scoreListChrome = StyleSheet.create({
  /** Outer list card — same as each Scores player block. */
  sectionCard: {
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  /** Per-match / per-pick row inside a section card. */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  /** First row in a card with no header — skip the top rule. */
  rowFirst: {
    borderTopWidth: 0,
  },
  /** Selected / has-pick wash. */
  rowPicked: {
    backgroundColor: colors.menuActive,
  },
  team: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
});
