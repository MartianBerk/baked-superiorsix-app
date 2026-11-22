import type { PropsWithChildren } from 'react';
import type {
  AccessibilityRole,
  StyleProp,
  ViewStyle,
} from 'react-native';

import { scrubberChrome } from '@/features/matches/scrubberChrome';

import { GlassChrome } from './GlassChrome';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
}>;

/** iOS scrubber chip — same Liquid Glass materials as the bottom nav. */
export function ScrubberRow({
  children,
  style,
  accessibilityRole = 'adjustable',
  accessibilityLabel,
}: Props) {
  return (
    <GlassChrome
      style={[scrubberChrome.rowLayout, style]}
      borderRadius={12}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </GlassChrome>
  );
}
