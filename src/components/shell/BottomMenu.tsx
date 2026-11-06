import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';
import { MenuIcon, type MenuIconName } from '@/components/icons/MenuIcon';
import {
  LongPressMenu,
  type LongPressMenuOption,
} from '@/components/shell/LongPressMenu';
import { useUserTabMode } from '@/features/auth/UserTabModeContext';
import { useLeadersTabMode } from '@/features/leaders/LeadersTabModeContext';
import { useFixturesTabMode } from '@/features/matches/FixturesTabModeContext';
import { colors } from '@/theme';

/** Tab order: fixtures → scores → leaders → user (rightmost). */
const TAB_ICONS: Record<string, MenuIconName> = {
  index: 'fixtures',
  scores: 'scores',
  leaders: 'leaders',
  profile: 'users',
};

/** Superior Six role that unlocks the admin long-press destination. */
const ADMIN_ROLE = 'admin';

const HIT_SIZE = 48;

/** Expo Router SDK 58 tabBar props (navigation replaced by navigateToTab). */
type TabBarProps = {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  descriptors: Record<
    string,
    {
      options: {
        title?: string;
        tabBarAccessibilityLabel?: string;
      };
    }
  >;
  navigateToTab: (routeKey: string) => void;
};

/**
 * Main menu at the bottom — inset ~3% each side, rounded bar,
 * circular selected highlight around each icon.
 *
 * Long-press (~500ms) fixtures, leaders, or user when signed in with `admin`
 * offers only the other mode (Admin while on player, Player while on admin).
 * Mode swaps the tab body in place — header + nav stay visible.
 */
export function BottomMenu({ state, descriptors, navigateToTab }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, hasRole } = useAuth();
  const { mode: profileMode, setMode: setProfileMode } = useUserTabMode();
  const { mode: fixturesMode, setMode: setFixturesMode } = useFixturesTabMode();
  const { mode: leadersMode, setMode: setLeadersMode } = useLeadersTabMode();
  const canAdminMenu = isAuthenticated && hasRole(ADMIN_ROLE);

  const profileRoute = useMemo(
    () => state.routes.find((r) => r.name === 'profile'),
    [state.routes],
  );
  const fixturesRoute = useMemo(
    () => state.routes.find((r) => r.name === 'index'),
    [state.routes],
  );
  const leadersRoute = useMemo(
    () => state.routes.find((r) => r.name === 'leaders'),
    [state.routes],
  );

  const profileLongPressOptions = useMemo((): LongPressMenuOption[] | null => {
    if (!canAdminMenu || !profileRoute) {
      return null;
    }
    if (profileMode === 'normal') {
      return [
        {
          id: 'admin',
          label: 'Admin',
          icon: <MenuIcon name="cog" size={18} color={colors.text} />,
          onSelect: () => {
            setProfileMode('admin');
            navigateToTab(profileRoute.key);
          },
        },
      ];
    }
    return [
      {
        id: 'normal',
        label: 'Player',
        icon: <MenuIcon name="users" size={18} color={colors.text} />,
        onSelect: () => {
          setProfileMode('normal');
          navigateToTab(profileRoute.key);
        },
      },
    ];
  }, [canAdminMenu, profileRoute, profileMode, setProfileMode, navigateToTab]);

  const fixturesLongPressOptions = useMemo((): LongPressMenuOption[] | null => {
    if (!canAdminMenu || !fixturesRoute) {
      return null;
    }
    if (fixturesMode === 'normal') {
      return [
        {
          id: 'admin',
          label: 'Admin',
          icon: <MenuIcon name="cog" size={18} color={colors.text} />,
          onSelect: () => {
            setFixturesMode('admin');
            navigateToTab(fixturesRoute.key);
          },
        },
      ];
    }
    return [
      {
        id: 'normal',
        label: 'Player',
        icon: <MenuIcon name="fixtures" size={18} color={colors.text} />,
        onSelect: () => {
          setFixturesMode('normal');
          navigateToTab(fixturesRoute.key);
        },
      },
    ];
  }, [
    canAdminMenu,
    fixturesRoute,
    fixturesMode,
    setFixturesMode,
    navigateToTab,
  ]);

  const leadersLongPressOptions = useMemo((): LongPressMenuOption[] | null => {
    if (!canAdminMenu || !leadersRoute) {
      return null;
    }
    if (leadersMode === 'normal') {
      return [
        {
          id: 'admin',
          label: 'Admin',
          icon: <MenuIcon name="cog" size={18} color={colors.text} />,
          onSelect: () => {
            setLeadersMode('admin');
            navigateToTab(leadersRoute.key);
          },
        },
      ];
    }
    return [
      {
        id: 'normal',
        label: 'Player',
        icon: <MenuIcon name="leaders" size={18} color={colors.text} />,
        onSelect: () => {
          setLeadersMode('normal');
          navigateToTab(leadersRoute.key);
        },
      },
    ];
  }, [
    canAdminMenu,
    leadersRoute,
    leadersMode,
    setLeadersMode,
    navigateToTab,
  ]);

  return (
    <View
      style={[
        styles.outer,
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
    >
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const iconName = TAB_ICONS[route.name];
          if (!iconName) {
            return null;
          }

          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          let longPressOptions: LongPressMenuOption[] | null = null;
          if (route.name === 'profile') {
            longPressOptions = profileLongPressOptions;
          } else if (route.name === 'index') {
            longPressOptions = fixturesLongPressOptions;
          } else if (route.name === 'leaders') {
            longPressOptions = leadersLongPressOptions;
          }

          const showAdminBadge =
            (route.name === 'profile' && profileMode === 'admin') ||
            (route.name === 'index' && fixturesMode === 'admin') ||
            (route.name === 'leaders' && leadersMode === 'admin');

          return (
            <LongPressMenu
              key={route.key}
              options={longPressOptions}
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              onPress={() => {
                if (!focused) {
                  navigateToTab(route.key);
                }
              }}
              style={({ pressed }) => [
                styles.itemSlot,
                pressed && styles.itemPressed,
              ]}
            >
              <View style={[styles.hit, focused && styles.hitActive]}>
                <MenuIcon
                  name={iconName}
                  size={28}
                  active={focused}
                  adminBadge={showAdminBadge}
                />
              </View>
            </LongPressMenu>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: '3%',
    paddingTop: 8,
    backgroundColor: colors.background,
  },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.menuBar,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  itemSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hit: {
    width: HIT_SIZE,
    height: HIT_SIZE,
    borderRadius: HIT_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitActive: {
    backgroundColor: colors.menuActive,
  },
  itemPressed: {
    opacity: 0.8,
  },
});
