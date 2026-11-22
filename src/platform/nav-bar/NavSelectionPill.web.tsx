import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

import { NAV_HIT_SIZE } from './hitSize';

/**
 * Web selected-tab treatment — lighter wash (not green). BottomMenu slides it.
 */
export function NavSelectionPill() {
  return <View style={styles.pill} />;
}

const styles = StyleSheet.create({
  pill: {
    width: NAV_HIT_SIZE,
    height: NAV_HIT_SIZE,
    borderRadius: NAV_HIT_SIZE / 2,
    backgroundColor: colors.menuActive,
  },
});
