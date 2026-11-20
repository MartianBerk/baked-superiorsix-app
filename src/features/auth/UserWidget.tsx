import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth';
import { KeyboardScreen } from '@/platform/keyboard';
import { colors } from '@/theme';

import { LoginForm } from './LoginForm';
import { SessionPanel } from './SessionPanel';

/** Main user-widget body: login when signed out, profile form when in. */
export function UserWidget() {
  const { status, isAuthenticated } = useAuth();

  if (status === 'loading') {
    return (
      <View style={[styles.shell, styles.centered]}>
        <ActivityIndicator color={colors.textMuted} />
      </View>
    );
  }

  if (isAuthenticated) {
    return (
      <View style={styles.shell}>
        <SessionPanel />
      </View>
    );
  }

  return (
    <KeyboardScreen
      style={styles.shell}
      contentContainerStyle={styles.centered}
    >
      <LoginForm />
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 8,
    paddingBottom: 16,
  },
  /** Keep signed-out login vertically centered; profile sits under the header. */
  centered: {
    justifyContent: 'center',
  },
});
