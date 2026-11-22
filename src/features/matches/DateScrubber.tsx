import { useState } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';

import { ScrubberRow } from '@/platform/glass';

import { ScrubberActiveCenter } from './ScrubberActiveCenter';
import {
  ScrubberSidePreview,
  type ScrubberSideDensity,
} from './ScrubberSidePreview';
import { ScrubberSlidingText } from './ScrubberSlidingText';
import { formatScrubberDate } from './formatMatchDate';
import type { ScrubDirection } from './scrubberSlide';

type Props = {
  dates: string[];
  selectedDate: string | null;
  onChange: (dayKey: string) => void;
  /** Outer row style (e.g. clear margin when nested in a side-by-side row). */
  style?: StyleProp<ViewStyle>;
  /**
   * Side mini density. Full-width Euros/World Cup date scrubbers use `wide`
   * so `Sat 31 Oct` is not ellipsized; admin full-width date chip uses `medium`;
   * compact fits the 60% date column beside the slate scrubber.
   */
  sideDensity?: ScrubberSideDensity;
};

/** Left/right date scrubber through available match days. */
export function DateScrubber({
  dates,
  selectedDate,
  onChange,
  style,
  sideDensity = 'compact',
}: Props) {
  const [direction, setDirection] = useState<ScrubDirection | null>(null);

  if (!selectedDate || dates.length === 0) {
    return null;
  }

  const index = dates.indexOf(selectedDate);
  const canLeft = index > 0;
  const canRight = index >= 0 && index < dates.length - 1;
  const label = formatScrubberDate(selectedDate);
  const leftLabel = canLeft ? formatScrubberDate(dates[index - 1]) : null;
  const rightLabel = canRight ? formatScrubberDate(dates[index + 1]) : null;

  return (
    <ScrubberRow style={style}>
      <ScrubberSidePreview
        label={leftLabel}
        accessibilityLabel={
          leftLabel ? `Previous match date, ${leftLabel}` : 'Previous match date'
        }
        disabled={!canLeft}
        direction={direction}
        density={sideDensity}
        onPress={() => {
          if (!canLeft) {
            return;
          }
          setDirection('left');
          onChange(dates[index - 1]);
        }}
      />

      <ScrubberActiveCenter
        morphKey={label}
        direction={direction}
        density={sideDensity}
      >
        <ScrubberSlidingText label={label} direction={direction} />
      </ScrubberActiveCenter>

      <ScrubberSidePreview
        label={rightLabel}
        accessibilityLabel={
          rightLabel ? `Next match date, ${rightLabel}` : 'Next match date'
        }
        disabled={!canRight}
        direction={direction}
        density={sideDensity}
        onPress={() => {
          if (!canRight) {
            return;
          }
          setDirection('right');
          onChange(dates[index + 1]);
        }}
      />
    </ScrubberRow>
  );
}
