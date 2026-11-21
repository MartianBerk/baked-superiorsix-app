import { type PropsWithChildren, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';

import { colors } from '@/theme';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

function useReduceTransparency(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((value) => {
      if (mounted) {
        setEnabled(value);
      }
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setEnabled,
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return enabled;
}

/**
 * iOS bottom-nav material: Liquid Glass on iOS 26+ when available,
 * else system blur material. Solid fallback for Reduce Transparency.
 */
export function NavBarSurface({ children, style }: Props) {
  const reduceTransparency = useReduceTransparency();
  const canLiquidGlass =
    !reduceTransparency &&
    isLiquidGlassAvailable() &&
    isGlassEffectAPIAvailable();

  if (canLiquidGlass) {
    return (
      <GlassView
        style={[styles.bar, style]}
        glassEffectStyle="regular"
        colorScheme="dark"
        tintColor={colors.menuBar}
        isInteractive
      >
        {children}
      </GlassView>
    );
  }

  if (!reduceTransparency) {
    return (
      <BlurView
        intensity={85}
        tint="systemChromeMaterialDark"
        style={[styles.bar, styles.clip, style]}
      >
        {children}
      </BlurView>
    );
  }

  return <View style={[styles.bar, styles.solid, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  clip: {
    overflow: 'hidden',
  },
  solid: {
    backgroundColor: colors.menuBar,
  },
});
