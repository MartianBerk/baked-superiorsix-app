import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

type TabTransitionContextValue = {
  beginTabTransition: () => void;
};

const TabTransitionContext = createContext<TabTransitionContextValue | null>(
  null,
);

/** Call before `navigateToTab` to show the interim loading chrome. */
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
 * Covers the tab body only — header and menu stay visible.
 */
export function TabTransitionProvider({ children }: PropsWithChildren) {
  const [visible, setVisible] = useState(false);

  const beginTabTransition = useCallback(() => {
    setVisible(true);
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
      beginTabTransition,
    }),
    [beginTabTransition],
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
