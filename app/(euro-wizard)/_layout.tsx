import { Stack } from 'expo-router';

import { colors } from '@/theme';

/** Euro Wizard experience boundary (stub shell for SS-8). */
export default function EuroWizardLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Euro Wizard' }} />
    </Stack>
  );
}
