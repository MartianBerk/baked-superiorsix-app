import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth';
import { colors } from '@/theme';

import { LoginForm } from './LoginForm';
import { SessionPanel } from './SessionPanel';

/** Main user-widget body: login when signed out, profile form when in. */
export function UserWidget() {
  const { status, isAuthenticated } = useAuth();

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textMuted} />
      </View>
    );
  }

  return (
    <View style={styles.center}>
      {isAuthenticated ? <SessionPanel /> : <LoginForm heading="Sign in" />}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingVertical: 24,
  },
});
