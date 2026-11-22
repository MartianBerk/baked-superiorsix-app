import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

type Props = {
  borderRadius: number;
  style?: StyleProp<ViewStyle>;
};

/** Web active scrubber option — lighter wash (not green). */
export function ScrubberSelectionPill({ borderRadius, style }: Props) {
  return (
    <View
      style={[styles.fill, { borderRadius, backgroundColor: colors.menuActive }, style]}
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
  },
});
