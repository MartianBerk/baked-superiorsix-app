import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/auth';
import { colors } from '@/theme';

import { ProfileForm } from './ProfileForm';

/** Signed-in user widget: profile form + sign out. */
export function SessionPanel() {
  const { session, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!session) {
    return null;
  }

  const onSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.wrap}>
        <ProfileForm />

        <Text style={styles.meta}>
          roles · {session.roles.length ? session.roles.join(', ') : 'none'}
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            void onSignOut();
          }}
          style={({ pressed }) => [
            styles.button,
            (pressed || busy) && styles.pressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.buttonText}>Sign out</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  wrap: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 20,
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.menuActive,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
