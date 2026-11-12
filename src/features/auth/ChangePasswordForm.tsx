import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ApiError, changePassword } from '@/api';
import { useAuth } from '@/auth';
import { colors } from '@/theme';

import {
  isPasswordComplex,
  PASSWORD_COMPLEXITY_MESSAGE,
} from './passwordPolicy';

/**
 * Security panel: change password via baked-auth
 * `POST /v1/auth/change-password`. On success, force sign-out so the user
 * re-authenticates with the new password.
 */
export function ChangePasswordForm() {
  const { token, signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPasswordBlurred, setNewPasswordBlurred] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const passwordsMatch =
    newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit =
    !busy &&
    !!token &&
    currentPassword.length > 0 &&
    isPasswordComplex(newPassword) &&
    passwordsMatch;

  const onSubmit = async () => {
    setError(null);
    if (!token) {
      setError('Not signed in.');
      return;
    }
    if (!currentPassword || !newPassword) {
      setError('Enter your current and new passwords.');
      return;
    }
    if (!isPasswordComplex(newPassword)) {
      setError(PASSWORD_COMPLEXITY_MESSAGE);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await changePassword(token, {
        currentPassword,
        newPassword,
      });
      // Auth AS bumps token_version; clear local session and show Sign in.
      await signOut();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('Current password is incorrect.');
        } else if (err.status === 403) {
          setError(
            'This account has no password yet. Use First login to set one.',
          );
        } else {
          setError(err.message);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Could not change password.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.lede}>
        Choose a new password, then sign in again with it.
      </Text>

      <Text style={styles.label}>Current password</Text>
      <TextInput
        style={styles.input}
        accessibilityLabel="Current password"
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        editable={!busy}
        value={currentPassword}
        onChangeText={(value) => {
          setCurrentPassword(value);
          if (error) setError(null);
        }}
        placeholder="Current password"
        placeholderTextColor={colors.textMuted}
        returnKeyType="next"
      />

      <Text style={styles.label}>New password</Text>
      <TextInput
        style={styles.input}
        accessibilityLabel="New password"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!busy}
        value={newPassword}
        onChangeText={(value) => {
          setNewPassword(value);
          setNewPasswordBlurred(false);
          if (error) setError(null);
        }}
        onBlur={() => {
          setNewPasswordBlurred(true);
        }}
        placeholder="New password"
        placeholderTextColor={colors.textMuted}
        returnKeyType="next"
      />

      <Text style={styles.label}>Confirm new password</Text>
      <TextInput
        style={styles.input}
        accessibilityLabel="Confirm new password"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!busy}
        value={confirmPassword}
        onChangeText={(value) => {
          setConfirmPassword(value);
          if (error) setError(null);
        }}
        placeholder="Confirm new password"
        placeholderTextColor={colors.textMuted}
        returnKeyType="done"
        onSubmitEditing={() => {
          if (canSubmit) {
            void onSubmit();
          }
        }}
      />

      {confirmPassword.length > 0 && newPassword !== confirmPassword ? (
        <Text style={styles.error}>Passwords do not match.</Text>
      ) : newPasswordBlurred &&
        newPassword.length > 0 &&
        !isPasswordComplex(newPassword) ? (
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
          <Text style={styles.buttonText}>Change password</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  lede: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
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
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
