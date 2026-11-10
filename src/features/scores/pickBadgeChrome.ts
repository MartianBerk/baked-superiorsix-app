import { StyleSheet } from 'react-native';

import { colors } from '@/theme';

/**
 * Canonical H/D/A badge chrome from Scores `PickOutcomeBadge`.
 * Matches expand picker + Euros/WC mid-row pickers reuse these tokens
 * so selected grey and correct green look identical everywhere.
 */
export const pickBadgeChrome = StyleSheet.create({
  /** Selected (not correct) — lighter grey fill. */
  badge: {
    width: 27,
    height: 27,
    borderRadius: 8,
    backgroundColor: colors.menuActive,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeCompact: {
    width: 22,
    height: 22,
    borderRadius: 6,
  },
  /** Correct pick — green. */
  badgeCorrect: {
    backgroundColor: colors.accent,
    borderColor: colors.accentBright,
  },
  badgeLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
    lineHeight: 14,
  },
  badgeLabelCompact: {
    fontSize: 11,
    lineHeight: 13,
  },
  /**
   * Unselected option in a 3-way picker (Scores outcome badge has no
   * unselected state — empty slot). Same footprint as `badge`.
   */
  badgeIdle: {
    width: 27,
    height: 27,
    borderRadius: 8,
    backgroundColor: colors.menuBar,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeLabelIdle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
    lineHeight: 14,
  },
  /**
   * Wider footprint for HOME / DRAW / AWAY on player pickers (legacy
   * GamePrediction / PlayerPrediction wording).
   */
  badgeSelection: {
    minWidth: 50,
    height: 27,
    paddingHorizontal: 7,
    borderRadius: 8,
    backgroundColor: colors.menuActive,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeSelectionIdle: {
    minWidth: 50,
    height: 27,
    paddingHorizontal: 7,
    borderRadius: 8,
    backgroundColor: colors.menuBar,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeSelectionLabel: {
    color: colors.text,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.1,
    lineHeight: 11,
  },
  badgeSelectionLabelIdle: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.1,
    lineHeight: 11,
  },
});
