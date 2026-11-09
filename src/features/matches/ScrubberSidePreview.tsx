import { Pressable, View } from 'react-native';

import { ScrubberSlidingText } from './ScrubberSlidingText';
import { scrubberChrome } from './scrubberChrome';
import type { ScrubDirection } from './scrubberSlide';

export type ScrubberSideDensity = 'compact' | 'medium' | 'wide';

type Props = {
  /** Mini destination label; null/empty → empty spacer (end of range). */
  label: string | null;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
  /** Same scrub direction as the centre header so side previews keep pace. */
  direction: ScrubDirection | null;
  /**
   * `compact` (default): `# n` / short labels in narrow Matches/Scores chips.
   * `medium`: word minis (`Matches` / `Table`) on side-game scrubbers.
   * `wide`: longer Leaders minis (`Performance`).
   */
  density?: ScrubberSideDensity;
};

function hitStyleFor(density: ScrubberSideDensity) {
  if (density === 'wide') {
    return scrubberChrome.sideHitWide;
  }
  if (density === 'medium') {
    return scrubberChrome.sideHitMedium;
  }
  return scrubberChrome.sideHit;
}

/**
 * Left/right scrubber control: mini destination header instead of a chevron.
 */
export function ScrubberSidePreview({
  label,
  accessibilityLabel,
  disabled,
  onPress,
  direction,
  density = 'compact',
}: Props) {
  const show = Boolean(label) && !disabled;
  const hitStyle = hitStyleFor(density);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={!show}
      onPress={onPress}
      style={({ pressed }) => [
        hitStyle,
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
