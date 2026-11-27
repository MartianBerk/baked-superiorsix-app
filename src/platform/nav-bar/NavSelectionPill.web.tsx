import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

import {
  NAV_PILL_HEIGHT,
  NAV_PILL_RADIUS,
  NAV_PILL_WIDTH,
} from './hitSize';

/**
 * Web selected-tab treatment — lighter wash rounded rect. BottomMenu slides it.
 */
export function NavSelectionPill() {
  return <View style={styles.pill} />;
}

const styles = StyleSheet.create({
  pill: {
    width: NAV_PILL_WIDTH,
    height: NAV_PILL_HEIGHT,
    borderRadius: NAV_PILL_RADIUS,
    backgroundColor: colors.menuActive,
  },
});
