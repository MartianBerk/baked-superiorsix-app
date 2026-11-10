import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/auth';
import { useUserTabMode } from '@/features/auth/UserTabModeContext';
import { SCRUBBER_ROW_TAIL_GAP } from '@/features/matches/scrubberChrome';
import { colors } from '@/theme';

import { AdminInviteForm } from './AdminInviteForm';
import { LoginForm } from '../auth/LoginForm';
import {
  UserAdminViewScrubber,
  type UserAdminViewMode,
} from './UserAdminViewScrubber';

const ADMIN_ROLE = 'admin';

/**
 * Admin experience body (invite/roster). Rendered inside the user tab when
 * mode is admin — does not navigate away from the Super Six shell.
 */
export function AdminWidget() {
  const { status, isAuthenticated, hasRole } = useAuth();
  const { setMode } = useUserTabMode();
  const [view, setView] = useState<UserAdminViewMode>('invite');

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textMuted} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.center}>
        <LoginForm />
      </View>
    );
  }

  if (!hasRole(ADMIN_ROLE)) {
    return (
      <View style={styles.center}>
        <View style={styles.wrap}>
          <Text style={styles.heading}>Admin required</Text>
          <Text style={styles.lede}>
            Your account does not have the superiorsix admin role.
          </Text>
          <Text
            accessibilityRole="link"
            onPress={() => setMode('normal')}
            style={styles.link}
          >
            Back to profile
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.scrubberWrap}>
        <UserAdminViewScrubber mode={view} onChange={setView} />
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.panelWrap}>
          <AdminInviteForm panel={view} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  scrubberWrap: {
    paddingHorizontal: '3%',
    paddingTop: 12,
    marginBottom: SCRUBBER_ROW_TAIL_GAP,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  panelWrap: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  wrap: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  heading: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  lede: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  link: {
    color: colors.accentBright,
    fontSize: 15,
    fontWeight: '500',
  },
});
