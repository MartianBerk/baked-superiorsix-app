import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/shell/AppHeader';
import { BottomMenu } from '@/components/shell/BottomMenu';
import { RoundStatusProvider } from '@/components/shell/RoundStatusContext';
import { UserTabModeProvider } from '@/features/auth/UserTabModeContext';
import { LeadersTabModeProvider } from '@/features/leaders/LeadersTabModeContext';
import { FixturesTabModeProvider } from '@/features/matches/FixturesTabModeContext';
import { ScoresTabModeProvider } from '@/features/scores/ScoresTabModeContext';
import { colors } from '@/theme';

/**
 * Core Super Six experience: header (round | logo | prize) + bottom menu.
 * Profile, fixtures, scores, and leaders admin modes swap in place via
 * tab-mode providers (header + nav stay visible).
 */
export default function SuperSixLayout() {
  return (
    <UserTabModeProvider>
      <FixturesTabModeProvider>
        <ScoresTabModeProvider>
          <LeadersTabModeProvider>
            <RoundStatusProvider>
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
                    options={{
                      title: 'Fixtures',
                      tabBarAccessibilityLabel: 'Fixtures',
                    }}
                  />
                  <Tabs.Screen
                    name="scores"
                    options={{
                      title: 'Scores',
                      tabBarAccessibilityLabel: 'Scores',
                    }}
                  />
                  <Tabs.Screen
                    name="leaders"
                    options={{
                      title: 'Leaders',
                      tabBarAccessibilityLabel: 'Leaders',
                    }}
                  />
                  <Tabs.Screen
                    name="profile"
                    options={{
                      title: 'Profile',
                      tabBarAccessibilityLabel: 'Profile',
                    }}
                  />
                </Tabs>
              </View>
            </RoundStatusProvider>
          </LeadersTabModeProvider>
        </ScoresTabModeProvider>
      </FixturesTabModeProvider>
    </UserTabModeProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
