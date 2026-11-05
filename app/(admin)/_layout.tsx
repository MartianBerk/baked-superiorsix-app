import { Stack } from 'expo-router';

import { colors } from '@/theme';

/**
 * Admin experience boundary (SS-56).
 * Role gate lives in AdminWidget so signed-out admins can still sign in here.
 */
export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Admin' }} />
    </Stack>
  );
}
