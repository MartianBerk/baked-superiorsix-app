import { Stack } from 'expo-router';

import { colors } from '@/theme';

/** Euros experience boundary (redirects into Super Six tab). */
export default function EurosLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Euros' }} />
    </Stack>
  );
}
