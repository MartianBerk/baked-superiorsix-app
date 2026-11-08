import { Pressable, View } from 'react-native';

import { ScrubberSlidingText } from './ScrubberSlidingText';
import { scrubberChrome } from './scrubberChrome';
import type { ScrubDirection } from './scrubberSlide';

type Props = {
  /** Mini destination label; null/empty → empty spacer (end of range). */
  label: string | null;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
  /** Same scrub direction as the centre header so side previews keep pace. */
  direction: ScrubDirection | null;
};

/**
 * Left/right scrubber control: mini destination header instead of a chevron.
 */
export function ScrubberSidePreview({
  label,
  accessibilityLabel,
  disabled,
  onPress,
  direction,
}: Props) {
  const show = Boolean(label) && !disabled;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={!show}
      onPress={onPress}
      style={({ pressed }) => [
        scrubberChrome.sideHit,
        !show && scrubberChrome.sideDisabled,
        pressed && show && scrubberChrome.pressed,
      ]}
    >
      {show && label ? (
        <ScrubberSlidingText
          label={label}
          direction={direction}
          size="mini"
          style={scrubberChrome.sideLabel}
        />
      ) : (
        <View style={scrubberChrome.sideSpacer} />
      )}
    </Pressable>
  );
}
