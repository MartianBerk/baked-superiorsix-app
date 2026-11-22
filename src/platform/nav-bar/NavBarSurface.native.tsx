import type { PropsWithChildren } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { GlassChrome } from '@/platform/glass';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

const BAR_RADIUS = 20;

/**
 * Bottom nav pill — shared GlassChrome (clear Liquid Glass / thin blur).
 * More transparent than the earlier regular + heavy blur path.
 */
export function NavBarSurface({ children, style }: Props) {
  return (
    <GlassChrome style={[styles.bar, style]} borderRadius={BAR_RADIUS}>
      {children}
    </GlassChrome>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: BAR_RADIUS,
  },
});
