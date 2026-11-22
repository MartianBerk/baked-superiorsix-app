import { StyleSheet } from 'react-native';

import { GlassChrome } from '@/platform/glass';

import {
  NAV_PILL_HEIGHT,
  NAV_PILL_RADIUS,
  NAV_PILL_WIDTH,
} from './hitSize';

/**
 * iOS selected-tab treatment — Liquid Glass rounded rect that BottomMenu slides
 * (with squash/stretch on travel).
 */
export function NavSelectionPill() {
  return <GlassChrome style={styles.pill} borderRadius={NAV_PILL_RADIUS} />;
}

const styles = StyleSheet.create({
  pill: {
    width: NAV_PILL_WIDTH,
    height: NAV_PILL_HEIGHT,
    borderRadius: NAV_PILL_RADIUS,
  },
});
