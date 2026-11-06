import { SvgXml } from 'react-native-svg';

import { colors } from '@/theme';

/** Lucide circle-plus — add to Super Six selection. */
const ADD = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>`;

/** Lucide circle-minus — drop from Super Six selection. */
const DROP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>`;

type Props = {
  selected: boolean;
  size?: number;
  color?: string;
};

/** Add/drop toggle: swaps SVG by selection state. */
export function SelectionToggleIcon({
  selected,
  size = 26,
  color,
}: Props) {
  const stroke =
    color ?? (selected ? colors.accentBright : colors.textMuted);
  const xml = (selected ? DROP : ADD).replaceAll('CURRENT', stroke);
  return <SvgXml xml={xml} width={size} height={size} />;
}
