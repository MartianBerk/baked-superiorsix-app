import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

import { NAV_PILL_RADIUS, NAV_PILL_SIZE } from './hitSize';

/**
 * Web selected-tab treatment — lighter wash rounded square. BottomMenu slides it.
 */
export function NavSelectionPill() {
  return <View style={styles.pill} />;
}

const styles = StyleSheet.create({
  pill: {
    width: NAV_PILL_SIZE,
    height: NAV_PILL_SIZE,
    borderRadius: NAV_PILL_RADIUS,
    backgroundColor: colors.menuActive,
  },
});
