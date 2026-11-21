import type { ViewStyle } from 'react-native';

import { colors } from '@/theme';

/** Web: solid page strip under the menu — unchanged from pre–SS-266. */
export const navBarOuterStyle: ViewStyle = {
  paddingHorizontal: '3%',
  paddingTop: 8,
  backgroundColor: colors.background,
};
