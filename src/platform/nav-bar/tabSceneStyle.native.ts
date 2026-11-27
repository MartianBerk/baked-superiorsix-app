import type { ViewStyle } from 'react-native';

import { NAV_BAR_CONTENT_HEIGHT } from './outerStyle';

/**
 * Extra bottom inset so list content clears the absolute glass pill + typical
 * home indicator (~34). Slightly generous so last rows stay tappable.
 */
export const tabSceneStyle: ViewStyle = {
  paddingBottom: NAV_BAR_CONTENT_HEIGHT + 40,
};
