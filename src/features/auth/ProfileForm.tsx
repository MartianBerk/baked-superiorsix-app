import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  ApiError,
  fetchProfileByAuth,
  profileFieldsFromDocument,
  updateProfileDetails,
  type ProfileFields,
} from '@/api';
import { useAuth } from '@/auth';
import { colors } from '@/theme';

const EMPTY_FIELDS: ProfileFields = {
  first_name: '',
  last_name: '',
  nickname: '',
  email: '',
};

type LoadState = 'loading' | 'ready' | 'missing' | 'error';

/**
 * Signed-in profile submission: first name, last name, nickname, email.
 * Loads via baked-user by-auth; saves via superiorsix `/user/updatedetails`.
 */
export function ProfileForm() {
  const { session, token } = useAuth();
  const [fields, setFields] = useState<ProfileFields>(EMPTY_FIELDS);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token || !session?.userId) {
      setLoadState('error');
      setLoadError('Signed-in session is missing a user id.');
      return;
    }
    setLoadState('loading');
    setLoadError(null);
    setSavedNote(null);
    try {
      const doc = await fetchProfileByAuth(token, session.userId);
      setFields(profileFieldsFromDocument(doc));
      setLoadState('ready');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setFields(EMPTY_FIELDS);
        setLoadState('missing');
        setLoadError(
          'No roster profile yet. If you were invited, use First login to register and accept, then reload.',
        );
        return;
      }
      setLoadState('error');
      setLoadError(
        err instanceof Error ? err.message : 'Could not load profile.',
      );
    }
  }, [token, session?.userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = (key: keyof ProfileFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setSavedNote(null);
    setSubmitError(null);
  };

  const onSubmit = async () => {
    setSubmitError(null);
    setSavedNote(null);
    const first = fields.first_name.trim();
    const last = fields.last_name.trim();
    const nick = fields.nickname.trim();
    const mail = fields.email.trim();
    if (!first || !last || !mail) {
      setSubmitError('First name, last name, and email are required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setSubmitError('Enter a valid email address.');
      return;
    }
    if (!token) {
      setSubmitError('Not signed in.');
      return;
    }
    if (loadState === 'missing') {
      setSubmitError(
        'Cannot save — no roster profile. Complete First login (register & join) first.',
      );
      return;
    }

    setBusy(true);
    try {
      const updated = await updateProfileDetails(token, {
        first_name: first,
        last_name: last,
        email: mail,
        ...(nick ? { nickname: nick } : {}),
      });
      setFields({
        first_name: updated.first_name,
        last_name: updated.last_name,
        nickname: updated.nickname ?? '',
        email: updated.email ?? '',
      });
      setLoadState('ready');
      setSavedNote('Profile saved.');
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Could not save profile.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (loadState === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.textMuted} />
      </View>
    );
  }

  const canSubmit = loadState === 'ready' && !busy;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Your profile</Text>
      <Text style={styles.lede}>
        {session?.username ? `${session.username} · ` : ''}
        first name, last name, nickname, and email.
      </Text>

      {loadState === 'missing' || loadState === 'error' ? (
        <Text style={styles.warn}>{loadError}</Text>
      ) : null}

      <Text style={styles.label}>First name</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="words"
        autoCorrect={false}
        editable={!busy && loadState === 'ready'}
        value={fields.first_name}
        onChangeText={(v) => setField('first_name', v)}
        placeholder="First name"
        placeholderTextColor={colors.textMuted}
        returnKeyType="next"
      />

      <Text style={styles.label}>Last name</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="words"
        autoCorrect={false}
        editable={!busy && loadState === 'ready'}
        value={fields.last_name}
        onChangeText={(v) => setField('last_name', v)}
        placeholder="Last name"
        placeholderTextColor={colors.textMuted}
        returnKeyType="next"
      />

      <Text style={styles.label}>Nickname</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="words"
        autoCorrect={false}
        editable={!busy && loadState === 'ready'}
        value={fields.nickname}
        onChangeText={(v) => setField('nickname', v)}
        placeholder="Optional nickname"
        placeholderTextColor={colors.textMuted}
        returnKeyType="next"
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        editable={!busy && loadState === 'ready'}
        value={fields.email}
        onChangeText={(v) => setField('email', v)}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        returnKeyType="done"
        onSubmitEditing={() => {
          if (canSubmit) {
            void onSubmit();
          }
        }}
      />

      {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
      {savedNote ? <Text style={styles.saved}>{savedNote}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={!canSubmit}
        onPress={() => {
          void onSubmit();
        }}
        style={({ pressed }) => [
          styles.button,
          (!canSubmit || pressed) && styles.buttonPressed,
        ]}
      >
        {busy ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.buttonText}>Save profile</Text>
        )}
      </Pressable>

      {loadState !== 'ready' ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            void load();
          }}
          style={({ pressed }) => [
            styles.secondary,
            (pressed || busy) && styles.buttonPressed,
          ]}
        >
          <Text style={styles.secondaryText}>Reload profile</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  wrap: {
    width: '100%',
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
  warn: {
    color: '#E0C07A',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
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
  saved: {
    color: colors.accentBright,
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
  secondary: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  secondaryText: {
    color: colors.text,
    fontSize: 15,
  },
});
