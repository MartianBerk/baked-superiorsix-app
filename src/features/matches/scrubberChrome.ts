import { StyleSheet } from 'react-native';

import { colors } from '@/theme';

/**
 * Shared left/right scrubber banner chrome (admin date + player G/W).
 * Sized ~25% thinner than the original 10/44 padding/hit targets.
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
  chevronHit: {
    width: 33,
    height: 33,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16.5,
  },
  chevronDisabled: {
    opacity: 0.35,
  },
  chevronSpacer: {
    width: 18,
    height: 18,
  },
  pressed: {
    backgroundColor: colors.menuActive,
  },
});

/** Default SVG chevron size inside the thinner scrubber hit target. */
export const SCRUBBER_CHEVRON_SIZE = 18;
