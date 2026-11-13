import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/shell/AppHeader';
import { BottomMenu } from '@/components/shell/BottomMenu';
import { DualModeAuthReset } from '@/components/shell/DualModeAuthReset';
import { GamedayHeaderSync } from '@/components/shell/GamedayHeaderSync';
import { GamedayRoundStatusSync } from '@/components/shell/GamedayRoundStatusSync';
import { LiveScoresProvider } from '@/components/shell/LiveScoresContext';
import { RoundStatusProvider } from '@/components/shell/RoundStatusContext';
import { TabTransitionProvider } from '@/components/shell/TabTransitionContext';
import { tabSlideTransition } from '@/components/shell/tabSlideTransition';
import { UserTabModeProvider } from '@/features/auth/UserTabModeContext';
import { LeadersTabModeProvider } from '@/features/leaders/LeadersTabModeContext';
import { FixturesTabModeProvider } from '@/features/matches/FixturesTabModeContext';
import { ScoresTabModeProvider } from '@/features/scores/ScoresTabModeContext';
import {
  SideGamesOpenProvider,
  useSideGamesOpen,
} from '@/features/side-games/SideGamesOpenContext';
import { colors } from '@/theme';

/**
 * Core Super Six experience: header (round | logo | prize) + bottom menu.
 * Profile, fixtures, scores, and leaders admin modes swap in place via
 * tab-mode providers (header + nav stay visible).
 * At most one side-game tab: Euros open hides World Cup (and vice versa).
 */
function SuperSixTabs() {
  const { eurosOpen, worldcupOpen } = useSideGamesOpen();
  // Mutual exclusion — only the open tournament’s icon appears.
  const showEuros = eurosOpen;
  const showWorldcup = worldcupOpen && !eurosOpen;

  return (
    <View style={styles.shell}>
      <AppHeader />
      <TabTransitionProvider>
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
            lazy: false,
            sceneStyle: { backgroundColor: colors.background },
            ...tabSlideTransition,
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
          name="euros"
          options={{
            title: 'Euros',
            tabBarAccessibilityLabel: 'Euros',
            href: showEuros ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="worldcup"
          options={{
            title: 'World Cup',
            tabBarAccessibilityLabel: 'World Cup',
            href: showWorldcup ? undefined : null,
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
      </TabTransitionProvider>
    </View>
  );
}

export default function SuperSixLayout() {
  return (
    <UserTabModeProvider>
      <FixturesTabModeProvider>
        <ScoresTabModeProvider>
          <LeadersTabModeProvider>
            <RoundStatusProvider>
              <LiveScoresProvider>
                <SideGamesOpenProvider>
                  <DualModeAuthReset />
                  <GamedayHeaderSync />
                  <GamedayRoundStatusSync />
                  <SuperSixTabs />
                </SideGamesOpenProvider>
              </LiveScoresProvider>
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
