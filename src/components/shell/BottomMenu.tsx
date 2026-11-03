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
 * Main menu at the bottom.
 * User is the rightmost item (legacy menu placement for account).
 * No tournament / Euro / Qatar entries in this bar (SS-8).
 */
export function BottomMenu({ state, descriptors, navigateToTab }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
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
              styles.item,
              focused && styles.itemActive,
              pressed && styles.itemPressed,
            ]}
          >
            <MenuIcon name={iconName} size={32} active={focused} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.menuBar,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: 6,
    borderRadius: 10,
  },
  itemActive: {
    backgroundColor: colors.menuActive,
  },
  itemPressed: {
    opacity: 0.8,
  },
});
