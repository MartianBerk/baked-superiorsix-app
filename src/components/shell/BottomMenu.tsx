import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
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
import {
  NAV_HIT_SIZE,
  NAV_PILL_HEIGHT,
  NAV_PILL_WIDTH,
  NavBarSurface,
  NavSelectionPill,
  navBarIconActiveColor,
  navBarIconInactiveColor,
  navBarOuterStyle,
  useNavSelectionPillMotion,
} from '@/platform/nav-bar';

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
 * Main menu at the bottom — inset ~3% each side, rounded bar.
 * Selected option uses a sliding rounded-square pill (Liquid Glass + squash
 * on iOS; lighter wash translate on web). Dual-mode tabs swap on second tap.
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
  const { beginTabTransition, seedVisitedTab } = useTabTransition();

  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    const current = state.routes[state.index]?.name;
    if (current) {
      seedVisitedTab(current);
    }
  }, [state.index, state.routes, seedVisitedTab]);

  const visibleRoutes = useMemo(
    () =>
      state.routes.filter((route) => {
        const iconName = TAB_ICONS[route.name];
        if (!iconName) {
          return false;
        }
        if (route.name === 'euros' && !showEuros) {
          return false;
        }
        if (route.name === 'worldcup' && !showWorldcup) {
          return false;
        }
        const href = descriptors[route.key]?.options?.href;
        if (href === null) {
          return false;
        }
        return true;
      }),
    [state.routes, showEuros, showWorldcup, descriptors],
  );

  const focusedVisualIndex = useMemo(() => {
    const focusedKey = state.routes[state.index]?.key;
    if (!focusedKey) {
      return 0;
    }
    const idx = visibleRoutes.findIndex((route) => route.key === focusedKey);
    return idx >= 0 ? idx : 0;
  }, [state.index, state.routes, visibleRoutes]);

  const pillEnabled = trackWidth > 0 && visibleRoutes.length > 0;
  const pillTargetX = pillEnabled
    ? focusedVisualIndex * (trackWidth / visibleRoutes.length) +
      (trackWidth / visibleRoutes.length - NAV_PILL_WIDTH) / 2
    : 0;
  const pillStyle = useNavSelectionPillMotion(pillTargetX, pillEnabled);

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
        navBarOuterStyle,
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
    >
      <NavBarSurface>
        <View
          style={styles.track}
          onLayout={(event) => {
            const next = event.nativeEvent.layout.width;
            setTrackWidth((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
          }}
        >
          {pillEnabled ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.pillSlot, pillStyle]}
            >
              <NavSelectionPill />
            </Animated.View>
          ) : null}

          {visibleRoutes.map((route) => {
            const iconName = TAB_ICONS[route.name];
            const routeIndex = state.routes.findIndex((r) => r.key === route.key);
            const focused = state.index === routeIndex;
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
                    const firstVisit = beginTabTransition(route.name);
                    if (firstVisit) {
                      const href = TAB_PREFETCH_HREF[route.name];
                      if (href) {
                        router.prefetch(href);
                      }
                    }
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
                <View style={styles.hit}>
                  <MenuIcon
                    name={iconName}
                    size={
                      route.name === 'euros' || route.name === 'worldcup'
                        ? 30
                        : 28
                    }
                    active={focused}
                    color={
                      focused
                        ? navBarIconActiveColor
                        : navBarIconInactiveColor
                    }
                    adminBadge={showAdminBadge}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      </NavBarSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  pillSlot: {
    position: 'absolute',
    left: 0,
    width: NAV_PILL_WIDTH,
    height: NAV_PILL_HEIGHT,
    zIndex: 0,
  },
  itemSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  hit: {
    width: NAV_HIT_SIZE,
    height: NAV_HIT_SIZE,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  itemPressed: {
    opacity: 0.8,
  },
});
