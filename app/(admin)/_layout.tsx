import { Stack } from 'expo-router';

import { useAuth } from '@/auth';
import { colors } from '@/theme';

/**
 * Admin experience boundary. Role gate stub — real ADMIN/DETAILS checks later.
 * Keep admin UI out of player Super Six screens.
 */
export default function AdminLayout() {
  const { hasRole } = useAuth();
  // Stub: allow navigation for scaffold; gate when auth is wired.
  void hasRole;

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
