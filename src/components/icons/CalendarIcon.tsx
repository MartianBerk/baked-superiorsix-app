import { SvgXml } from 'react-native-svg';

import { colors } from '@/theme';

/** Lucide `calendar` (ISC) — muted kickoff date marker. */
const CALENDAR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>`;

type Props = {
  size?: number;
  color?: string;
};

export function CalendarIcon({
  size = 16,
  color = colors.textMuted,
}: Props) {
  return (
    <SvgXml
      xml={CALENDAR.replaceAll('CURRENT', color)}
      width={size}
      height={size}
    />
  );
}
