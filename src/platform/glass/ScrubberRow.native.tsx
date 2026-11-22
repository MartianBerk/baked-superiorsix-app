import type { PropsWithChildren } from 'react';
import {
  View,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { scrubberChrome } from '@/features/matches/scrubberChrome';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
}>;

/**
 * Scrubber chip — solid surface only (no Liquid Glass / selection pill).
 * Nav bar keeps glass separately.
 */
export function ScrubberRow({
  children,
  style,
  accessibilityRole = 'adjustable',
  accessibilityLabel,
}: Props) {
  const a11y = {
    ...(accessibilityRole != null ? { accessibilityRole } : {}),
    ...(accessibilityLabel != null ? { accessibilityLabel } : {}),
  };
  return (
    <View style={[scrubberChrome.row, style]} {...a11y}>
      {children}
    </View>
  );
}
