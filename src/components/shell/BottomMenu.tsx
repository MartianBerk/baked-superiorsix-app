import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuIcon, type MenuIconName } from '@/components/icons/MenuIcon';
import { colors } from '@/theme';

/** Tab order: fixtures → scores → leaders → user (rightmost). */
const TAB_ICONS: Record<string, MenuIconName> = {
  index: 'fixtures',
  scores: 'scores',
  leaders: 'leaders',
  profile: 'users',
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
      };
    }
  >;
  navigateToTab: (routeKey: string) => void;
};

/**
 * Main menu at the bottom — inset ~5% each side, rounded bar,
 * circular selected highlight around each icon.
 */
export function BottomMenu({ state, descriptors, navigateToTab }: TabBarProps) {
  const insets = useSafeAreaInsets();

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

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
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
                <MenuIcon name={iconName} size={28} active={focused} />
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
    paddingHorizontal: '5%',
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
