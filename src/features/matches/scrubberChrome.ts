import { StyleSheet } from 'react-native';

import { colors } from '@/theme';

/** Compact side slot — fits `# n` / short date minis in the narrow slate column. */
export const SCRUBBER_SIDE_COMPACT = 40;
/** Wide side slot — fits muted “Performance” on the full-width Leaders scrubber. */
export const SCRUBBER_SIDE_WIDE = 92;

/**
 * Shared left/right scrubber banner chrome (admin date + player slate + stats).
 * Side slots hold mini destination labels (not chevrons). Compact is the default
 * so Matches/Scores slate chips (~⅓ width) still show the centre `# n`; Leaders
 * uses the wide hit target via `ScrubberSidePreview` density.
 */
export const scrubberChrome = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 7.5,
    marginBottom: 6,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  /**
   * Fixed side slot for mini destination labels (or empty spacer at range ends).
   * `overflow: 'visible'` so mini labels can shoot into the slot from off-chip.
   */
  sideHit: {
    width: SCRUBBER_SIDE_COMPACT,
    height: 33,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16.5,
    overflow: 'visible',
    paddingHorizontal: 2,
  },
  /** Full-width scrubbers that need longer mini labels (Performance / Winners). */
  sideHitWide: {
    width: SCRUBBER_SIDE_WIDE,
    height: 33,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16.5,
    overflow: 'visible',
    paddingHorizontal: 2,
  },
  sideDisabled: {
    opacity: 0.35,
  },
  /** Invisible stand-in when there is no destination on that side. */
  sideSpacer: {
    width: 18,
    height: 18,
  },
  sideLabel: {
    width: '100%',
  },
  /** Clips the centre header while it slides on scrub. */
  centerSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 4,
    minHeight: 22,
  },
  pressed: {
    backgroundColor: colors.menuActive,
  },
  // --- Back-compat aliases (KickoffDateDisplay / older call sites) ---
  /** @deprecated Prefer `sideHit` — same geometry for empty spacers. */
  chevronHit: {
    width: SCRUBBER_SIDE_COMPACT,
    height: 33,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16.5,
  },
  /** @deprecated Prefer `sideDisabled`. */
  chevronDisabled: {
    opacity: 0.35,
  },
  /** @deprecated Prefer `sideSpacer`. */
  chevronSpacer: {
    width: 18,
    height: 18,
  },
});

/** @deprecated Chevrons replaced by mini destination labels (SS-145). */
export const SCRUBBER_CHEVRON_SIZE = 18;
