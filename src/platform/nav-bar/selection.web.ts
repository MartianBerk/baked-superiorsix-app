import type { ViewStyle } from 'react-native';

import { colors } from '@/theme';

/**
 * Per-item hit chrome unused — selection is the sliding lighter pill
 * (`NavSelectionPill`). Icons match iOS contrast (no green accent).
 */
export const navBarHitActiveStyle: ViewStyle = {};

export const navBarIconActiveColor: string = colors.text;
export const navBarIconInactiveColor: string = colors.textMuted;
