import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';

import { useAuth } from '@/auth';
import { colors } from '@/theme';

import { AdminInviteForm } from './AdminInviteForm';
import { LoginForm } from '../auth/LoginForm';

const ADMIN_ROLE = 'admin';

/** Admin experience body: gate on superiorsix `admin`, then invite/roster. */
export function AdminWidget() {
  const { status, isAuthenticated, hasRole } = useAuth();

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textMuted} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.center}>
        <LoginForm heading="Admin sign in" />
      </View>
    );
  }

  if (!hasRole(ADMIN_ROLE)) {
    return <Redirect href="/(super-six)/profile" />;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.wrap}>
        <Text style={styles.kicker}>Admin</Text>
        <AdminInviteForm />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  scroll: {
    flexGrow: 1,
    paddingVertical: 24,
  },
  wrap: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  kicker: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
});
