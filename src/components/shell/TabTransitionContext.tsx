import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

/** Expo bottom-tab route `name` values under `(super-six)` (e.g. `scores`). */
export type TabRouteName = string;

type TabTransitionContextValue = {
  /**
   * Marks a tab as mounted without showing the loading overlay
   * (e.g. the route focused on initial load).
   */
  seedVisitedTab: (routeName: TabRouteName) => void;
  /**
   * Call before `navigateToTab`. Returns true on the first visit this session
   * (overlay shown); false when the tab was already opened once.
   */
  beginTabTransition: (routeName: TabRouteName) => boolean;
};

const TabTransitionContext = createContext<TabTransitionContextValue | null>(
  null,
);

export function useTabTransition(): TabTransitionContextValue {
  const ctx = useContext(TabTransitionContext);
  if (ctx == null) {
    throw new Error('useTabTransition requires TabTransitionProvider');
  }
  return ctx;
}

const OVERLAY_MAX_MS = Platform.select({ web: 1200, default: 700 });

/**
 * Brief centered spinner while a bottom-tab screen mounts (lazy route / heavy widget).
 * Spinner only on the first visit per tab per session; revisits switch instantly.
 */
export function TabTransitionProvider({ children }: PropsWithChildren) {
  const visitedTabsRef = useRef<Set<TabRouteName>>(new Set());
  const [visible, setVisible] = useState(false);

  const seedVisitedTab = useCallback((routeName: TabRouteName) => {
    visitedTabsRef.current.add(routeName);
  }, []);

  const beginTabTransition = useCallback((routeName: TabRouteName) => {
    const firstVisit = !visitedTabsRef.current.has(routeName);
    visitedTabsRef.current.add(routeName);
    if (firstVisit) {
      setVisible(true);
    }
    return firstVisit;
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const ready = setTimeout(() => {
      requestAnimationFrame(() => setVisible(false));
    }, Platform.select({ web: 48, default: 32 }));
    const fallback = setTimeout(() => setVisible(false), OVERLAY_MAX_MS);
    return () => {
      clearTimeout(ready);
      clearTimeout(fallback);
    };
  }, [visible]);

  const value = useMemo(
    () => ({
      seedVisitedTab,
      beginTabTransition,
    }),
    [seedVisitedTab, beginTabTransition],
  );

  return (
    <TabTransitionContext.Provider value={value}>
      <View style={styles.host}>
        {children}
        {visible ? (
          <View
            style={styles.overlay}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <ActivityIndicator size="large" color={colors.accentBright} />
          </View>
        ) : null}
      </View>
    </TabTransitionContext.Provider>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.background,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    zIndex: 10,
  },
});
