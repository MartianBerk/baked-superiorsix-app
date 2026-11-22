import type { ViewStyle } from 'react-native';

import { colors } from '@/theme';

/** No selection chip — Liquid Glass carries focus; icons use text contrast only. */
export const navBarHitActiveStyle: ViewStyle = {};

export const navBarIconActiveColor: string = colors.text;
export const navBarIconInactiveColor: string = colors.textMuted;
