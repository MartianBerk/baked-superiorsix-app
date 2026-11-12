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

import {
  isPasswordComplex,
  PASSWORD_COMPLEXITY_MESSAGE,
} from './passwordPolicy';

type Mode = 'signIn' | 'firstLogin';

/** Email / password against baked-auth (`audience=superiorsix`). */
export function LoginForm() {
  const { signIn, claimAndAcceptInvite } = useAuth();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBlurred, setPasswordBlurred] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const passwordsMatch =
    mode !== 'firstLogin' ||
    (password.length > 0 && password === confirmPassword);
  const canSubmit =
    !busy &&
    email.trim().length > 0 &&
    password.length > 0 &&
    (mode !== 'firstLogin' || (isPasswordComplex(password) && passwordsMatch));

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter email and password.');
      return;
    }
    if (mode === 'firstLogin' && !isPasswordComplex(password)) {
      setError(PASSWORD_COMPLEXITY_MESSAGE);
      return;
    }
    if (mode === 'firstLogin' && password !== confirmPassword) {
      setError('Passwords do not match.');
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
      <View style={styles.modeRow}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            setMode('signIn');
            setConfirmPassword('');
            setPasswordBlurred(false);
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
            setConfirmPassword('');
            setPasswordBlurred(false);
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

      <TextInput
        style={styles.input}
        accessibilityLabel="Email"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        editable={!busy}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        onSubmitEditing={() => {
          if (canSubmit) void onSubmit();
        }}
      />

      <TextInput
        style={styles.input}
        accessibilityLabel={
          mode === 'firstLogin' ? 'Choose Password' : 'Password'
        }
        secureTextEntry
        autoComplete={mode === 'firstLogin' ? 'new-password' : 'current-password'}
        textContentType={mode === 'firstLogin' ? 'newPassword' : 'password'}
        editable={!busy}
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          if (mode === 'firstLogin') {
            setPasswordBlurred(false);
          }
          if (error) setError(null);
        }}
        onBlur={() => {
          if (mode === 'firstLogin') {
            setPasswordBlurred(true);
          }
        }}
        placeholder={mode === 'firstLogin' ? 'Choose Password' : 'Password'}
        placeholderTextColor={colors.textMuted}
        onSubmitEditing={() => {
          if (canSubmit) void onSubmit();
        }}
      />

      {mode === 'firstLogin' ? (
        <TextInput
          style={styles.input}
          accessibilityLabel="Confirm Password"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          editable={!busy}
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            if (error) setError(null);
          }}
          placeholder="Confirm Password"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={() => {
            if (canSubmit) void onSubmit();
          }}
        />
      ) : null}

      {mode === 'firstLogin' &&
      confirmPassword.length > 0 &&
      password !== confirmPassword ? (
        <Text style={styles.error}>Passwords do not match.</Text>
      ) : mode === 'firstLogin' &&
        passwordBlurred &&
        password.length > 0 &&
        !isPasswordComplex(password) ? (
        <Text style={styles.error}>{PASSWORD_COMPLEXITY_MESSAGE}</Text>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={!canSubmit}
        onPress={() => {
          void onSubmit();
        }}
        style={({ pressed }) => [
          styles.button,
          (!canSubmit || pressed) && styles.buttonPressed,
          !canSubmit && styles.buttonDisabled,
        ]}
      >
        {busy ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.buttonText}>
            {mode === 'firstLogin' ? 'Join' : 'Sign in'}
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
  buttonDisabled: {
    opacity: 0.45,
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
