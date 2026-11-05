import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/auth';
import { colors } from '@/theme';

/** Signed-in summary for the user widget (profile edit is SS-51). */
export function SessionPanel() {
  const { session, lastSmoke, signOut, runSmoke } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!session) {
    return null;
  }

  const onSmoke = async () => {
    setBusy(true);
    try {
      await runSmoke();
    } finally {
      setBusy(false);
    }
  };

  const onSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Signed in</Text>
      <Text style={styles.username}>{session.username}</Text>
      <Text style={styles.meta}>audience · {session.audience}</Text>
      <Text style={styles.meta}>
        roles · {session.roles.length ? session.roles.join(', ') : 'none'}
      </Text>

      <View style={styles.smokeBox}>
        <Text style={styles.smokeTitle}>BFF smoke</Text>
        {lastSmoke ? (
          <>
            <Text style={styles.smokeLine}>
              health {lastSmoke.healthOk ? 'ok' : 'down'} · token{' '}
              {lastSmoke.tokenAccepted ? 'accepted' : 'rejected'}
              {lastSmoke.probeStatus
                ? ` · probe ${lastSmoke.probeStatus}`
                : ''}
            </Text>
            <Text style={styles.smokeMsg}>{lastSmoke.message}</Text>
          </>
        ) : (
          <Text style={styles.smokeMsg}>Running…</Text>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={onSmoke}
        style={({ pressed }) => [
          styles.secondary,
          (pressed || busy) && styles.pressed,
        ]}
      >
        {busy ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.secondaryText}>Re-run BFF smoke</Text>
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={onSignOut}
        style={({ pressed }) => [
          styles.button,
          (pressed || busy) && styles.pressed,
        ]}
      >
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  heading: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  username: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 4,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 2,
  },
  smokeBox: {
    marginTop: 20,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  smokeTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  smokeLine: {
    color: colors.accentBright,
    fontSize: 13,
    marginBottom: 6,
  },
  smokeMsg: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  secondary: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: 10,
  },
  secondaryText: {
    color: colors.text,
    fontSize: 15,
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
