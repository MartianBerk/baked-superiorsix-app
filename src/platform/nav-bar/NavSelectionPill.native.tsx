import { StyleSheet } from 'react-native';

import { GlassChrome } from '@/platform/glass';

import { NAV_PILL_RADIUS, NAV_PILL_SIZE } from './hitSize';

/**
 * iOS selected-tab treatment — Liquid Glass rounded square that BottomMenu slides
 * (with squash/stretch on travel).
 */
export function NavSelectionPill() {
  return <GlassChrome style={styles.pill} borderRadius={NAV_PILL_RADIUS} />;
}

const styles = StyleSheet.create({
  pill: {
    width: NAV_PILL_SIZE,
    height: NAV_PILL_SIZE,
    borderRadius: NAV_PILL_RADIUS,
  },
});
