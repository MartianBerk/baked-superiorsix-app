import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';
import { MenuIcon, type MenuIconName } from '@/components/icons/MenuIcon';
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

/** Superior Six role that unlocks admin mode via second tap. */
const ADMIN_ROLE = 'admin';

/** Tabs that swap player ↔ admin widgets in place. */
const DUAL_MODE_TABS = new Set(['index', 'leaders', 'profile']);

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
 * Dual-mode tabs (fixtures, leaders, user): first tap focuses the tab;
 * second tap on the already-focused tab swaps player ↔ admin in place when
 * the signed-in user has superiorsix `admin`. Non-admins get a no-op on that
 * second tap. Header + nav stay visible during the swap.
 */
export function BottomMenu({ state, descriptors, navigateToTab }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, hasRole } = useAuth();
  const { mode: profileMode, setMode: setProfileMode } = useUserTabMode();
  const { mode: fixturesMode, setMode: setFixturesMode } = useFixturesTabMode();
  const { mode: leadersMode, setMode: setLeadersMode } = useLeadersTabMode();
  const canAdminToggle = isAuthenticated && hasRole(ADMIN_ROLE);

  const toggleDualMode = useCallback(
    (routeName: string) => {
      if (!canAdminToggle) {
        return;
      }
      if (routeName === 'profile') {
        setProfileMode(profileMode === 'normal' ? 'admin' : 'normal');
        return;
      }
      if (routeName === 'index') {
        setFixturesMode(fixturesMode === 'normal' ? 'admin' : 'normal');
        return;
      }
      if (routeName === 'leaders') {
        setLeadersMode(leadersMode === 'normal' ? 'admin' : 'normal');
      }
    },
    [
      canAdminToggle,
      profileMode,
      fixturesMode,
      leadersMode,
      setProfileMode,
      setFixturesMode,
      setLeadersMode,
    ],
  );

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
          const isDualMode = DUAL_MODE_TABS.has(route.name);
          const showAdminBadge =
            (route.name === 'profile' && profileMode === 'admin') ||
            (route.name === 'index' && fixturesMode === 'admin') ||
            (route.name === 'leaders' && leadersMode === 'admin');

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              accessibilityHint={
                isDualMode && canAdminToggle
                  ? focused
                    ? 'Tap again to switch admin and player mode'
                    : 'Tap twice when selected to switch admin and player mode'
                  : undefined
              }
              onPress={() => {
                if (!focused) {
                  navigateToTab(route.key);
                  return;
                }
                if (isDualMode) {
                  toggleDualMode(route.name);
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
            </Pressable>
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
