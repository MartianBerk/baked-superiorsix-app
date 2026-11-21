import type { ViewStyle } from 'react-native';

/**
 * Transparent chrome around the glass pill so the material can sample
 * whatever sits behind the tab bar slot (not a solid page slab).
 */
export const navBarOuterStyle: ViewStyle = {
  paddingHorizontal: '3%',
  paddingTop: 8,
  backgroundColor: 'transparent',
};
