import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { colors } from '@/theme';

/**
 * Bottom-menu icons (stroke-based).
 * Football: Tabler Icons (MIT). Standings/stats/settings: Lucide (ISC).
 * User: simplified from legacy supersixapp.
 */
const FOOTBALL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M12 7l4.76 3.45l-1.76 5.55h-6l-1.76 -5.55z"/><path d="M12 7v-4m3 13l2.5 3m-.74 -8.55l3.74 -1.45m-11.44 7.05l-2.56 2.95m.74 -8.55l-3.74 -1.45"/></svg>`;

const STANDINGS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 12h11"/><path d="M10 18h11"/><path d="M10 6h11"/><path d="M4 10h2"/><path d="M4 6h1v4"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`;

const STATS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>`;

const USERS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

/** Lucide settings / cog — used as a subtle admin-mode badge on the user tab. */
const COG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;

const ICONS = {
  fixtures: FOOTBALL,
  scores: STANDINGS,
  leaders: STATS,
  users: USERS,
  cog: COG,
} as const;

export type MenuIconName = keyof typeof ICONS;

type Props = {
  name: MenuIconName;
  size?: number;
  color?: string;
  active?: boolean;
  /** When true on the user icon, overlays a small top-right cog badge. */
  adminBadge?: boolean;
};

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

  if (!adminBadge || name !== 'users') {
    return icon;
  }

  // ~1.5× the previous 0.42 ratio so the admin cog reads clearly on the tab.
  const badgeSize = Math.max(15, Math.round(size * 0.63));
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
