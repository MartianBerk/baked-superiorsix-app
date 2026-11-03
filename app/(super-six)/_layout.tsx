import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/shell/AppHeader';
import { BottomMenu } from '@/components/shell/BottomMenu';
import { colors } from '@/theme';

/**
 * Core Super Six experience: header (round/prize + user FAB) + bottom menu.
 * Profile is reachable from the FAB only (not a bottom-tab item).
 */
export default function SuperSixLayout() {
  return (
    <View style={styles.shell}>
      <AppHeader />
      <Tabs
        tabBar={({ state, descriptors, navigateToTab }) => (
          <BottomMenu
            state={state}
            descriptors={descriptors}
            navigateToTab={navigateToTab}
          />
        )}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Fixtures', tabBarAccessibilityLabel: 'Fixtures' }}
        />
        <Tabs.Screen
          name="scores"
          options={{ title: 'Scores', tabBarAccessibilityLabel: 'Scores' }}
        />
        <Tabs.Screen
          name="leaders"
          options={{ title: 'Leaders', tabBarAccessibilityLabel: 'Leaders' }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            href: null,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
