import type { PropsWithChildren } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { colors } from '@/theme';

/** Logical phone canvas (~iPhone 14/15 class). */
const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;
/** Below this, stay full-bleed (real phones / narrow browser). */
const FRAME_MIN_VIEWPORT = 480;

/**
 * Web desktop: centre a phone-sized app frame on a plain brand backdrop.
 * Narrow viewports render children full-bleed (no nested frame).
 */
export function WebPhoneFrame({ children }: PropsWithChildren) {
  const { width, height } = useWindowDimensions();

  if (width < FRAME_MIN_VIEWPORT) {
    return <View style={styles.fullBleed}>{children}</View>;
  }

  const frameHeight = Math.min(PHONE_HEIGHT, Math.max(560, height - 32));
  const frameWidth = Math.min(
    PHONE_WIDTH,
    Math.round(frameHeight * (PHONE_WIDTH / PHONE_HEIGHT)),
  );

  return (
    <View style={styles.stage}>
      <View
        style={[
          styles.phone,
          {
            width: frameWidth,
            height: frameHeight,
          },
        ]}
      >
        <View style={styles.phoneInner}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullBleed: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stage: {
    flex: 1,
    width: '100%',
    minHeight: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    // Slightly deeper than in-app bg so the phone silhouette reads clearly.
    backgroundColor: '#040C16',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  phone: {
    backgroundColor: colors.background,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    maxWidth: '100%',
  },
  phoneInner: {
    flex: 1,
  },
});
