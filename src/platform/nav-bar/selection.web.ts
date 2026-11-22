import type { ViewStyle } from 'react-native';

import { colors } from '@/theme';

/** Web keeps the circular active chip + green accent icons. */
export const navBarHitActiveStyle: ViewStyle = {
  backgroundColor: colors.menuActive,
};

export const navBarIconActiveColor: string = colors.accentBright;
export const navBarIconInactiveColor: string = colors.textMuted;
