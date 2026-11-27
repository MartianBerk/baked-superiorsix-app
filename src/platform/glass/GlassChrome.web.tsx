import type { PropsWithChildren } from 'react';
import {
  View,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
}>;

/**
 * Web: plain View — callers keep their solid `scrubberChrome.row` / nav styles.
 * Must not introduce Liquid Glass / blur on web.
 */
export function GlassChrome({
  children,
  style,
  accessibilityRole,
  accessibilityLabel,
}: Props) {
  const a11y = {
    ...(accessibilityRole != null ? { accessibilityRole } : {}),
    ...(accessibilityLabel != null ? { accessibilityLabel } : {}),
  };
  return (
    <View style={style} {...a11y}>
      {children}
    </View>
  );
}
