import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider } from '@/auth';
import { WebPhoneFrame } from '@/platform/web-shell';
import { colors } from '@/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(super-six)',
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <WebPhoneFrame>
        <View style={styles.root}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(super-six)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(euros)" />
            <Stack.Screen name="(world-cup)" />
          </Stack>
        </View>
      </WebPhoneFrame>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
