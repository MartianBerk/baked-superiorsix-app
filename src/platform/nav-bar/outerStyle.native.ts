import type { ViewStyle } from 'react-native';

/**
 * Float the tab chrome over the scene so Liquid Glass can refract list
 * content scrolling underneath (in-flow bar only samples the solid shell).
 */
export const navBarOuterStyle: ViewStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 20,
  paddingHorizontal: '3%',
  paddingTop: 8,
  backgroundColor: 'transparent',
};

/** Pill height without home-indicator: top pad 8 + bar pad 8+48+8. */
export const NAV_BAR_CONTENT_HEIGHT = 72;
