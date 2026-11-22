import { StyleSheet } from 'react-native';

import { GlassChrome } from '@/platform/glass';

import { NAV_HIT_SIZE } from './hitSize';

/**
 * iOS selected-tab treatment — Liquid Glass circle that BottomMenu slides.
 */
export function NavSelectionPill() {
  return <GlassChrome style={styles.pill} borderRadius={NAV_HIT_SIZE / 2} />;
}

const styles = StyleSheet.create({
  pill: {
    width: NAV_HIT_SIZE,
    height: NAV_HIT_SIZE,
    borderRadius: NAV_HIT_SIZE / 2,
  },
});
