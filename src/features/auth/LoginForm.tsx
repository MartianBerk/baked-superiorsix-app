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

type Mode = 'signIn' | 'firstLogin';

type Props = {
  /** Shown above the form (e.g. profile tab vs /auth route). */
  heading?: string;
};

/** Email / password against baked-auth (`audience=superiorsix`). */
export function LoginForm({ heading }: Props) {
  const { signIn, claimAndAcceptInvite } = useAuth();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const title =
    heading ?? (mode === 'firstLogin' ? 'First login' : 'Sign in');
  const lede =
    mode === 'firstLogin'
      ? 'Invited? Set a password for your email, then join the roster. Roles were granted when you were invited.'
      : 'baked-auth token with audience superiorsix. Session is stored on this device.';

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter email and password.');
      return;
    }
    if (mode === 'firstLogin' && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'firstLogin') {
        await claimAndAcceptInvite(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(mode === 'firstLogin' ? 'First login failed.' : 'Sign in failed.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.lede}>{lede}</Text>

      <View style={styles.modeRow}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            setMode('signIn');
            setError(null);
          }}
          style={({ pressed }) => [
            styles.modeChip,
            mode === 'signIn' && styles.modeChipOn,
            (pressed || busy) && styles.pressed,
          ]}
        >
          <Text
            style={[
              styles.modeChipText,
              mode === 'signIn' && styles.modeChipTextOn,
            ]}
          >
            Sign in
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            setMode('firstLogin');
            setError(null);
          }}
          style={({ pressed }) => [
            styles.modeChip,
            mode === 'firstLogin' && styles.modeChipOn,
            (pressed || busy) && styles.pressed,
          ]}
        >
          <Text
            style={[
              styles.modeChipText,
              mode === 'firstLogin' && styles.modeChipTextOn,
            ]}
          >
            First login
          </Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        editable={!busy}
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={colors.textMuted}
        onSubmitEditing={() => {
          void onSubmit();
        }}
      />

      <Text style={styles.label}>
        {mode === 'firstLogin' ? 'Choose password' : 'Password'}
      </Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        autoComplete={mode === 'firstLogin' ? 'new-password' : 'current-password'}
        textContentType={mode === 'firstLogin' ? 'newPassword' : 'password'}
        editable={!busy}
        value={password}
        onChangeText={setPassword}
        placeholder={mode === 'firstLogin' ? 'min 8 characters' : 'password'}
        placeholderTextColor={colors.textMuted}
        onSubmitEditing={() => {
          void onSubmit();
        }}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => {
          void onSubmit();
        }}
        style={({ pressed }) => [
          styles.button,
          (pressed || busy) && styles.buttonPressed,
        ]}
      >
        {busy ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.buttonText}>
            {mode === 'firstLogin' ? 'Set password & join' : 'Sign in'}
          </Text>
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
    marginBottom: 16,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  modeChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  modeChipOn: {
    borderColor: colors.accentBright,
    backgroundColor: colors.menuActive,
  },
  modeChipText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  modeChipTextOn: {
    color: colors.text,
    fontWeight: '600',
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
  pressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
