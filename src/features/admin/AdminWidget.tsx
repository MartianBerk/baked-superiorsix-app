import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { useUserTabMode } from '@/features/auth/UserTabModeContext';
import { colors } from '@/theme';

import { AdminInviteForm } from './AdminInviteForm';
import { LoginForm } from '../auth/LoginForm';

const ADMIN_ROLE = 'admin';

/**
 * Admin experience body (invite/roster). Rendered inside the user tab when
 * mode is admin — does not navigate away from the Super Six shell.
 */
export function AdminWidget() {
  const { status, isAuthenticated, hasRole } = useAuth();
  const { setMode } = useUserTabMode();

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
    return (
      <View style={styles.center}>
        <View style={styles.wrap}>
          <Text style={styles.heading}>Admin required</Text>
          <Text style={styles.lede}>
            Your account does not have the superiorsix admin role.
          </Text>
          <Text
            accessibilityRole="link"
            onPress={() => setMode('normal')}
            style={styles.link}
          >
            Back to profile
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
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
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingVertical: 24,
    backgroundColor: colors.background,
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
  heading: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  lede: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  link: {
    color: colors.accentBright,
    fontSize: 15,
    fontWeight: '500',
  },
});
