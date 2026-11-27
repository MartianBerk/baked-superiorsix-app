import { type PropsWithChildren, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  View,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  GlassView,
  isGlassEffectAPIAvailable,
} from 'expo-glass-effect';

import { colors } from '@/theme';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  /** Corner radius (nav pill 20, scrubber chips 12). */
  borderRadius?: number;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
}>;

/**
 * Shared iOS Liquid Glass chrome (nav + scrubbers).
 * Prefer clear glass / light blur so content shows through more.
 */
export function GlassChrome({
  children,
  style,
  borderRadius = 12,
  accessibilityRole,
  accessibilityLabel,
}: Props) {
  const [reduceTransparency, setReduceTransparency] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((value) => {
      if (mounted) {
        setReduceTransparency(value);
      }
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setReduceTransparency,
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const apiAvailable = isGlassEffectAPIAvailable();
  const a11y = {
    ...(accessibilityRole != null ? { accessibilityRole } : {}),
    ...(accessibilityLabel != null ? { accessibilityLabel } : {}),
  };

  if (!reduceTransparency && apiAvailable) {
    return (
      <GlassView
        style={[styles.base, { borderRadius }, style]}
        // Clear reads more transparent than regular (Martin: show content through).
        glassEffectStyle="clear"
        colorScheme="dark"
        isInteractive
        // @ts-expect-error native borderRadius prop omitted from public types
        borderRadius={borderRadius}
        {...a11y}
      >
        {children}
      </GlassView>
    );
  }

  if (!reduceTransparency) {
    return (
      <BlurView
        intensity={55}
        tint="systemUltraThinMaterialDark"
        style={[styles.base, styles.clip, { borderRadius }, style]}
        {...a11y}
      >
        {children}
      </BlurView>
    );
  }

  return (
    <View
      style={[styles.base, styles.solid, { borderRadius }, style]}
      {...a11y}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  clip: {
    overflow: 'hidden',
  },
  solid: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
