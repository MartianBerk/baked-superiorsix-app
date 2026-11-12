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
import { SCRUBBER_ROW_TAIL_GAP } from '@/features/matches/scrubberChrome';
import { colors } from '@/theme';

import { ChangePasswordForm } from './ChangePasswordForm';
import { ProfileForm } from './ProfileForm';
import {
  UserProfileViewScrubber,
  type UserProfileViewMode,
} from './UserProfileViewScrubber';

/** Signed-in user widget: Profile | Security scrubber + sign out. */
export function SessionPanel() {
  const { session, signOut } = useAuth();
  const [view, setView] = useState<UserProfileViewMode>('profile');
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
    <View style={styles.root}>
      <View style={styles.scrubberWrap}>
        <UserProfileViewScrubber mode={view} onChange={setView} />
      </View>
      <View style={styles.emailWrap}>
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          ellipsizeMode="middle"
          style={styles.emailHeading}
        >
          {session.email}
        </Text>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.wrap}>
          {view === 'profile' ? <ProfileForm /> : <ChangePasswordForm />}

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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  emailWrap: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  emailHeading: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'left',
  },
  scrubberWrap: {
    paddingHorizontal: '3%',
    paddingTop: 4,
    marginBottom: SCRUBBER_ROW_TAIL_GAP,
  },
  scrollView: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  wrap: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  button: {
    marginTop: 20,
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
