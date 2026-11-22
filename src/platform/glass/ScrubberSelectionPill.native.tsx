import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { GlassChrome } from './GlassChrome';

type Props = {
  borderRadius: number;
  style?: StyleProp<ViewStyle>;
};

/** iOS active scrubber option — Liquid Glass fill inside the centre slot. */
export function ScrubberSelectionPill({ borderRadius, style }: Props) {
  return (
    <GlassChrome style={[styles.fill, style]} borderRadius={borderRadius} />
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
  },
});
