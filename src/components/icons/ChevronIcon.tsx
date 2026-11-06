import { SvgXml } from 'react-native-svg';

import { colors } from '@/theme';

const CHEVRON_LEFT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;

const CHEVRON_RIGHT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`;

type Props = {
  direction: 'left' | 'right';
  size?: number;
  color?: string;
};

/** Polished SVG chevron for the admin date scrubber (not text `<`/`>`). */
export function ChevronIcon({
  direction,
  size = 22,
  color = colors.text,
}: Props) {
  const xml = (direction === 'left' ? CHEVRON_LEFT : CHEVRON_RIGHT).replaceAll(
    'CURRENT',
    color,
  );
  return <SvgXml xml={xml} width={size} height={size} />;
}
