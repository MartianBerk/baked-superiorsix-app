import { Stack } from 'expo-router';

import { colors } from '@/theme';

/** World Cup experience boundary (redirects into Super Six tab). */
export default function WorldCupLayout() {
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
      <Stack.Screen name="index" options={{ title: 'World Cup' }} />
    </Stack>
  );
}
