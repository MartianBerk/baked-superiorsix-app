import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';

import { useAuth } from '@/auth';
import { useTabTransition } from '@/components/shell/TabTransitionContext';
import { MenuIcon, type MenuIconName } from '@/components/icons/MenuIcon';
import { useUserTabMode } from '@/features/auth/UserTabModeContext';
import { useLeadersTabMode } from '@/features/leaders/LeadersTabModeContext';
import { useFixturesTabMode } from '@/features/matches/FixturesTabModeContext';
import { useScoresTabMode } from '@/features/scores/ScoresTabModeContext';
import { useSideGamesOpen } from '@/features/side-games/SideGamesOpenContext';
import { colors } from '@/theme';

/**
 * Tab order: fixtures → scores → leaders → [euros|worldcup?] → user
 * (rightmost). At most one side-game trophy: open Euros hides World Cup
 * and vice versa.
 */
const TAB_ICONS: Record<string, MenuIconName> = {
  index: 'fixtures',
  scores: 'scores',
  leaders: 'leaders',
  euros: 'euros',
  worldcup: 'worldcup',
  profile: 'users',
};

/** Superior Six role that unlocks admin mode via second tap. */
const ADMIN_ROLE = 'admin';

/** Tabs that swap player ↔ admin widgets in place. */
const DUAL_MODE_TABS = new Set(['index', 'scores', 'leaders', 'profile']);

/** Warm tab route bundles before first paint (web code-split). */
const TAB_PREFETCH_HREF: Record<string, Href> = {
  index: '/(super-six)',
  scores: '/(super-six)/scores',
  leaders: '/(super-six)/leaders',
  euros: '/(super-six)/euros',
  worldcup: '/(super-six)/worldcup',
  profile: '/(super-six)/profile',
};

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
        href?: string | null;
      };
    }
  >;
  navigateToTab: (routeKey: string) => void;
};

/**
 * Main menu at the bottom — inset ~3% each side, rounded bar,
 * circular selected highlight around each icon.
 *
 * Dual-mode tabs (fixtures, scores, leaders, user): first tap focuses the tab;
 * second tap on the already-focused tab swaps player ↔ admin in place when
 * the signed-in user has superiorsix `admin`. Non-admins get a no-op on that
 * second tap. Header + nav stay visible during the swap.
 */
export function BottomMenu({ state, descriptors, navigateToTab }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, hasRole } = useAuth();
  const { mode: profileMode, setMode: setProfileMode } = useUserTabMode();
  const { mode: fixturesMode, setMode: setFixturesMode } = useFixturesTabMode();
  const { mode: scoresMode, setMode: setScoresMode } = useScoresTabMode();
  const { mode: leadersMode, setMode: setLeadersMode } = useLeadersTabMode();
  const { eurosOpen, worldcupOpen } = useSideGamesOpen();
  const showEuros = eurosOpen;
  const showWorldcup = worldcupOpen && !eurosOpen;
  const canAdminToggle = isAuthenticated && hasRole(ADMIN_ROLE);
  const { beginTabTransition } = useTabTransition();

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
      if (routeName === 'scores') {
        setScoresMode(scoresMode === 'normal' ? 'admin' : 'normal');
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
      scoresMode,
      leadersMode,
      setProfileMode,
      setFixturesMode,
      setScoresMode,
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

          // Only the open tournament’s icon (Euros wins if both somehow open).
          if (route.name === 'euros' && !showEuros) {
            return null;
          }
          if (route.name === 'worldcup' && !showWorldcup) {
            return null;
          }
          const href = descriptors[route.key]?.options?.href;
          if (href === null) {
            return null;
          }

          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const isDualMode = DUAL_MODE_TABS.has(route.name);
          const showAdminBadge =
            (route.name === 'profile' && profileMode === 'admin') ||
            (route.name === 'index' && fixturesMode === 'admin') ||
            (route.name === 'scores' && scoresMode === 'admin') ||
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
                  const href = TAB_PREFETCH_HREF[route.name];
                  if (href) {
                    router.prefetch(href);
                  }
                  beginTabTransition();
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
                  size={route.name === 'euros' || route.name === 'worldcup' ? 30 : 28}
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
