import type { PropsWithChildren } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}>;

/** Web: plain View — browser handles scroll/keyboard without RN wrappers. */
export function KeyboardScreen({
  children,
  style,
  contentContainerStyle,
}: Props) {
  return <View style={[style, contentContainerStyle]}>{children}</View>;
}
