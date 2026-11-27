import type { ViewStyle } from 'react-native';

import { colors } from '@/theme';

/**
 * Per-item hit chrome unused — selection is the sliding Liquid Glass pill
 * (`NavSelectionPill`).
 */
export const navBarHitActiveStyle: ViewStyle = {};

export const navBarIconActiveColor: string = colors.text;
export const navBarIconInactiveColor: string = colors.textMuted;
