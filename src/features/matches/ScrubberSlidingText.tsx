import { useEffect, useRef, useState } from 'react';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme';

import {
  SCRUB_SLIDE_MS,
  SCRUB_SLIDE_PX,
  type ScrubDirection,
} from './scrubberSlide';

type Props = {
  label: string;
  /** Direction of the scrub that produced this label; null snaps with no motion. */
  direction: ScrubDirection | null;
  /** `center` = current header; `mini` = destination preview in a side slot. */
  size?: 'center' | 'mini';
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  numberOfLines?: number;
};

function enterOffset(direction: ScrubDirection): number {
  return direction === 'right' ? SCRUB_SLIDE_PX : -SCRUB_SLIDE_PX;
}

function exitOffset(direction: ScrubDirection): number {
  return direction === 'right' ? -SCRUB_SLIDE_PX : SCRUB_SLIDE_PX;
}

/**
 * Scrubber label that slides with the scrub direction when its text changes.
 * Same left/right motion for centre headers and mini destination previews.
 */
export function ScrubberSlidingText({
  label,
  direction,
  size = 'center',
  style,
  accessibilityLabel,
  numberOfLines = 1,
}: Props) {
  const [displayed, setDisplayed] = useState(label);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const booted = useRef(false);

  useEffect(() => {
    if (!booted.current) {
      booted.current = true;
      // Newly appearing side preview after a scrub — slide in with the hop.
      if (direction != null) {
        translateX.value = enterOffset(direction);
        opacity.value = 0;
        translateX.value = withTiming(0, { duration: SCRUB_SLIDE_MS });
        opacity.value = withTiming(1, { duration: SCRUB_SLIDE_MS / 2 });
      }
      return;
    }

    if (label === displayed) {
      return;
    }

    if (direction == null) {
      setDisplayed(label);
      translateX.value = 0;
      opacity.value = 1;
      return;
    }

    opacity.value = withTiming(0, { duration: SCRUB_SLIDE_MS / 2 });
    translateX.value = withTiming(
      exitOffset(direction),
      { duration: SCRUB_SLIDE_MS },
      (finished) => {
        if (!finished) {
          return;
        }
        runOnJS(setDisplayed)(label);
        translateX.value = enterOffset(direction);
        opacity.value = 0;
        translateX.value = withTiming(0, { duration: SCRUB_SLIDE_MS });
        opacity.value = withTiming(1, { duration: SCRUB_SLIDE_MS / 2 });
      },
    );
  }, [label, direction, displayed, opacity, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text
      style={[
        size === 'mini' ? styles.mini : styles.center,
        style,
        animatedStyle,
      ]}
      accessibilityLabel={accessibilityLabel ?? displayed}
      numberOfLines={numberOfLines}
      ellipsizeMode="tail"
    >
      {displayed}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  center: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  mini: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
