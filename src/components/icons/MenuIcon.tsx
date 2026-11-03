import { SvgXml } from 'react-native-svg';

import { colors } from '@/theme';

/**
 * Bottom-menu icons (stroke-based).
 * Football: Tabler Icons (MIT). Standings/stats: Lucide (ISC).
 * User: simplified from legacy supersixapp.
 */
const FOOTBALL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M12 7l4.76 3.45l-1.76 5.55h-6l-1.76 -5.55z"/><path d="M12 7v-4m3 13l2.5 3m-.74 -8.55l3.74 -1.45m-11.44 7.05l-2.56 2.95m.74 -8.55l-3.74 -1.45"/></svg>`;

const STANDINGS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 12h11"/><path d="M10 18h11"/><path d="M10 6h11"/><path d="M4 10h2"/><path d="M4 6h1v4"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`;

const STATS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>`;

const USERS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

const ICONS = {
  fixtures: FOOTBALL,
  scores: STANDINGS,
  leaders: STATS,
  users: USERS,
} as const;

export type MenuIconName = keyof typeof ICONS;

type Props = {
  name: MenuIconName;
  size?: number;
  color?: string;
  active?: boolean;
};

export function MenuIcon({
  name,
  size = 28,
  color,
  active = false,
}: Props) {
  const stroke = color ?? (active ? colors.accentBright : colors.textMuted);
  const xml = ICONS[name].replaceAll('CURRENT', stroke);
  return <SvgXml xml={xml} width={size} height={size} />;
}
