import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { colors } from '@/theme';

/**
 * Bottom-menu icons.
 * Football: Tabler Icons (MIT). Standings/stats/settings: Lucide (ISC).
 * User: simplified from legacy supersixapp.
 * Euros / World Cup: legacy supersixapp trophy SVGs (fill/stroke CURRENT).
 */
const FOOTBALL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M12 7l4.76 3.45l-1.76 5.55h-6l-1.76 -5.55z"/><path d="M12 7v-4m3 13l2.5 3m-.74 -8.55l3.74 -1.45m-11.44 7.05l-2.56 2.95m.74 -8.55l-3.74 -1.45"/></svg>`;

const STANDINGS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 12h11"/><path d="M10 18h11"/><path d="M10 6h11"/><path d="M4 10h2"/><path d="M4 6h1v4"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`;

const STATS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>`;

const USERS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

/** Legacy Euro Wizard trophy (`assets/icons/euro-wizard.svg`). */
const EUROS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="none" stroke="CURRENT" stroke-width="2" stroke-miterlimit="10" d="M28.973,25h-10c-1.65,0-3-1.35-3-3V12c0-1.65,1.35-3,3-3h10c1.65,0,3,1.35,3,3v10C31.973,23.65,30.623,25,28.973,25z"/><path fill="CURRENT" d="M30.973,46h-14c0-1.875,1.127-2.216,2-3v-2c0,0,0.933-2,2-2c0,0,0-1.511,0-2c0-1.353-8-5.996-8-18c0-4.622,2.22-6,5-6h12c2.78,0,5,1.378,5,6c0,12.004-8,16.647-8,18c0,0.489,0,2,0,2c1.059,0,2,2,2,2v2C29.846,43.766,30.973,44.188,30.973,46z"/><path fill="CURRENT" d="M15.973,3l0.772,2.316C16.882,5.725,17.264,6,17.694,6h12.558c0.43,0,0.813-0.275,0.949-0.684L31.973,3H15.973z"/><path fill="CURRENT" d="M28.973,43h-10v-2h10V43z M26.973,37h-6v2h6V37z M28.973,25h-10v2h10V25z M27.973,20c0,2.209-1.791,4-4,4s-4-1.791-4-4s1.791-4,4-4S27.973,17.791,27.973,20z M25.973,20c0-1.105-0.895-2-2-2s-2,0.895-2,2s0.895,2,2,2S25.973,21.105,25.973,20z M19.973,13h8l-1-7h-6L19.973,13z M32.973,3V2h-18v1c0,0.552,0.448,1,1,1h16C32.526,4,32.973,3.552,32.973,3z"/></svg>`;

/** Legacy World Cup trophy (`assets/icons/world-cup.svg`, was qatar.svg). */
const WORLDCUP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="CURRENT" d="M 11.90625 2 C 9.20625 2 7 4.09375 7 6.59375 L 7 6.8125 L 7.1875 6.8125 C 7.4875 6.8125 7.8 6.9875 8 7.1875 C 7.9 5.5875 8.5 5.09375 8.5 5.09375 C 9.8 4.89375 10.19375 6 10.59375 7 C 10.99375 6.3 11.8125 5.8125 12.8125 5.8125 C 13.8125 5.8125 14.6 6.29375 15 7.09375 C 15.4 5.99375 15.79375 5.19375 16.59375 5.09375 C 15.89375 3.29375 14.10625 2 11.90625 2 z M 9 5.8125 C 8.1 8.8125 11.9 14.39375 9.5 19.59375 C 9.4 19.89375 8.6875 20.89375 8.6875 21.09375 C 8.6875 21.49375 10.2 21.90625 12 21.90625 C 13.8 21.90625 15.3125 21.59375 15.3125 21.09375 C 15.3125 20.79375 14.6 19.89375 14.5 19.59375 C 14.1 19.19375 13.5875 17.9875 13.6875 16.6875 C 13.6875 16.4875 12.3 18.70625 12 19.90625 C 11.9 14.70625 16.7 14.10625 17 5.90625 C 15.9 5.20625 15.2125 10.40625 13.3125 10.40625 L 12.59375 10.40625 C 9.89375 10.40625 9.9 5.6125 9 5.8125 z M 12.6875 6.6875 C 11.7875 6.6875 11.09375 7.3875 11.09375 8.1875 C 11.09375 8.9875 11.7875 9.6875 12.6875 9.6875 C 13.5875 9.6875 14.3125 9.0875 14.3125 8.1875 C 14.3125 7.3875 13.5875 6.6875 12.6875 6.6875 z M 7.09375 7.59375 C 7.49375 9.19375 8.7125 11.5125 9.3125 18.3125 C 9.3125 18.4125 9.6875 16.0875 9.6875 14.6875 C 9.4875 13.7875 8.9 11.10625 8.5 9.40625 C 8.1 8.50625 7.29375 7.39375 7.09375 7.59375 z"/></svg>`;

/** Lucide settings / cog — used as a subtle admin-mode badge on the user tab. */
const COG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;

const ICONS = {
  fixtures: FOOTBALL,
  scores: STANDINGS,
  leaders: STATS,
  users: USERS,
  euros: EUROS,
  worldcup: WORLDCUP,
  cog: COG,
} as const;

export type MenuIconName = keyof typeof ICONS;

type Props = {
  name: MenuIconName;
  size?: number;
  color?: string;
  active?: boolean;
  /**
   * When true on fixtures / scores / leaders / users tab icons, overlays a
   * small top-right cog badge (in-place admin mode).
   */
  adminBadge?: boolean;
};

const ADMIN_BADGE_ICONS: ReadonlySet<MenuIconName> = new Set([
  'fixtures',
  'scores',
  'leaders',
  'users',
]);

export function MenuIcon({
  name,
  size = 28,
  color,
  active = false,
  adminBadge = false,
}: Props) {
  const stroke = color ?? (active ? colors.accentBright : colors.textMuted);
  const xml = ICONS[name].replaceAll('CURRENT', stroke);
  const icon = <SvgXml xml={xml} width={size} height={size} />;

  if (!adminBadge || !ADMIN_BADGE_ICONS.has(name)) {
    return icon;
  }

  // Prior 0.567 factor ×0.9 again for a smaller admin cog badge.
  const badgeSize = Math.max(13, Math.round(size * 0.5103));
  const cogXml = COG.replaceAll('CURRENT', stroke);

  return (
    <View style={{ width: size, height: size }}>
      {icon}
      <View
        pointerEvents="none"
        style={[
          styles.cogBadge,
          {
            width: badgeSize,
            height: badgeSize,
            // Nudge slightly outside so the cog reads as a corner badge.
            top: -Math.round(badgeSize * 0.15),
            right: -Math.round(badgeSize * 0.2),
          },
        ]}
      >
        <SvgXml xml={cogXml} width={badgeSize} height={badgeSize} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cogBadge: {
    position: 'absolute',
  },
});
