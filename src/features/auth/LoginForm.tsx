import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ApiError } from '@/api';
import { useAuth } from '@/auth';
import { colors } from '@/theme';

type Props = {
  /** Shown above the form (e.g. profile tab vs /auth route). */
  heading?: string;
};

/** Username / password sign-in against baked-auth (`audience=superiorsix`). */
export function LoginForm({ heading = 'Sign in' }: Props) {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!username.trim() || !password) {
      setError('Enter username and password.');
      return;
    }
    setBusy(true);
    try {
      await signIn(username, password);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Sign in failed.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{heading}</Text>
      <Text style={styles.lede}>
        baked-auth token with audience superiorsix. Session is stored on this
        device.
      </Text>

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        editable={!busy}
        value={username}
        onChangeText={setUsername}
        placeholder="username"
        placeholderTextColor={colors.textMuted}
        onSubmitEditing={onSubmit}
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        editable={!busy}
        value={password}
        onChangeText={setPassword}
        placeholder="password"
        placeholderTextColor={colors.textMuted}
        onSubmitEditing={onSubmit}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={onSubmit}
        style={({ pressed }) => [
          styles.button,
          (pressed || busy) && styles.buttonPressed,
        ]}
      >
        {busy ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.buttonText}>Sign in</Text>
        )}
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
  lede: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  error: {
    color: '#E8A0A0',
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    marginTop: 4,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
