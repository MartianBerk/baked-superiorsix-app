import { Dimensions, Easing } from 'react-native';

import type { BottomTabNavigationOptions } from 'expo-router/js-tabs';

/**
 * Directional slide for bottom-tab major screens.
 *
 * Tab index left of the focused route sits at progress -1; right sits at +1.
 * Translating by full width slides the incoming screen from that side
 * (right-tab → from the right; left-tab → from the left).
 *
 * Uses Expo Router / React Navigation bottom-tabs transition APIs
 * (`transitionSpec` + `sceneStyleInterpolator`).
 */
const SLIDE_MS = 220;

function slideWidth(): number {
  return Dimensions.get('window').width;
}

export const tabSlideTransition = {
  transitionSpec: {
    animation: 'timing',
    config: {
      duration: SLIDE_MS,
      easing: Easing.out(Easing.cubic),
    },
  },
  sceneStyleInterpolator: ({ current }) => {
    const width = slideWidth();
    return {
      sceneStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [-width, 0, width],
            }),
          },
        ],
      },
    };
  },
} satisfies Pick<
  BottomTabNavigationOptions,
  'transitionSpec' | 'sceneStyleInterpolator'
>;
