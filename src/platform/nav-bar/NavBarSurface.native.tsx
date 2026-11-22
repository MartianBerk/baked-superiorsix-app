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

const BAR_RADIUS = 20;

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
 * Prefer true Liquid Glass whenever the UIGlassEffect API exists at runtime.
 *
 * Do **not** require `isLiquidGlassAvailable()` alone to pick GlassView — that
 * flag also encodes the *host app* Info.plist / build SDK (Expo Go's bundle).
 * Gate crashes with `isGlassEffectAPIAvailable()`; GlassView itself no-ops if
 * the effect cannot install.
 *
 * Avoid opaque `tintColor` (e.g. solid menuBar hex) — it makes glass look like
 * the old flat pill. Prefer native `borderRadius` prop over `overflow:'hidden'`.
 */
export function NavBarSurface({ children, style }: Props) {
  const reduceTransparency = useReduceTransparency();
  const apiAvailable = isGlassEffectAPIAvailable();
  const liquidReported = isLiquidGlassAvailable();

  useEffect(() => {
    if (!__DEV__) {
      return;
    }
    // Metro / Expo Go console breadcrumb once per mount.
    // eslint-disable-next-line no-console
    console.log(
      `[nav-bar] glass api=${apiAvailable} liquid=${liquidReported} reduceTransparency=${reduceTransparency}`,
    );
  }, [apiAvailable, liquidReported, reduceTransparency]);

  if (!reduceTransparency && apiAvailable) {
    return (
      <GlassView
        style={[styles.bar, style]}
        glassEffectStyle="regular"
        colorScheme="dark"
        isInteractive
        // Native corner prop (UICornerConfiguration); not yet on GlassViewProps.
        // @ts-expect-error borderRadius native prop omitted from public types
        borderRadius={BAR_RADIUS}
      >
        {children}
      </GlassView>
    );
  }

  if (!reduceTransparency) {
    return (
      <BlurView
        intensity={90}
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
    borderRadius: BAR_RADIUS,
  },
  clip: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  solid: {
    backgroundColor: colors.menuBar,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
