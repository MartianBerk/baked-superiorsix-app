import { Stack } from 'expo-router';

import { colors } from '@/theme';

/** Qatar Hero experience boundary (stub shell for SS-8). */
export default function QatarHeroLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Qatar Hero' }} />
    </Stack>
  );
}
