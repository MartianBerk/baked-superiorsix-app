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
  INVITE_PERMISSION_ROLES,
  addPlayer,
  invitePlayer,
  listPlayers,
  loginWithPassword,
  registerAuthUser,
  setAppMembership,
  type InvitePermissionRole,
  type PlayerProfile,
  SUPERIORSIX_AUDIENCE,
} from '@/api';
import { subjectFromJwt, useAuth } from '@/auth';
import { colors } from '@/theme';

const ROLE_LABELS: Record<InvitePermissionRole, string> = {
  player: 'Player',
  'user-profile': 'User profile',
  worldcup: 'World Cup',
  euros: 'Euros',
};

type RoleFlags = Record<InvitePermissionRole, boolean>;

const DEFAULT_ROLES: RoleFlags = {
  player: true,
  'user-profile': true,
  worldcup: false,
  euros: false,
};

function selectedRoles(flags: RoleFlags): InvitePermissionRole[] {
  return INVITE_PERMISSION_ROLES.filter((role) => flags[role]);
}

/**
 * Admin invite + roster form: creates invite, auth identity, membership roles,
 * and roster profile in one submit.
 */
export function AdminInviteForm() {
  const { token, authAdminToken } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [roles, setRoles] = useState<RoleFlags>(DEFAULT_ROLES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [roster, setRoster] = useState<PlayerProfile[]>([]);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);

  const refreshRoster = useCallback(async () => {
    if (!token) {
      setRoster([]);
      return;
    }
    setRosterLoading(true);
    setRosterError(null);
    try {
      setRoster(await listPlayers(token));
    } catch (err) {
      setRosterError(
        err instanceof Error ? err.message : 'Could not load roster.',
      );
    } finally {
      setRosterLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refreshRoster();
  }, [refreshRoster]);

  const toggleRole = (role: InvitePermissionRole) => {
    setRoles((prev) => ({ ...prev, [role]: !prev[role] }));
    setNote(null);
    setError(null);
  };

  const onSubmit = async () => {
    setError(null);
    setNote(null);

    const user = username.trim().toLowerCase();
    const first = firstName.trim();
    const last = lastName.trim();
    const nick = nickname.trim();
    const permissionRoles = selectedRoles(roles);

    if (!user || !password || !first || !last) {
      setError('Username, password, first name, and last name are required.');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,64}$/.test(user)) {
      setError('Username must be 3–64 letters, numbers, or underscores.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!token) {
      setError('Not signed in.');
      return;
    }
    if (!authAdminToken) {
      setError(
        'Auth-admin token missing. Sign in as a baked-auth admin (e.g. bootstrap ops) to set memberships.',
      );
      return;
    }
    if (permissionRoles.length === 0) {
      setError('Select at least one permission (player is typical).');
      return;
    }

    setBusy(true);
    const steps: string[] = [];
    try {
      const invite = await invitePlayer(token, {
        username: user,
        first_name: first,
        last_name: last,
        ...(nick ? { nickname: nick } : {}),
      });
      steps.push(`Invited ${invite.username} (${invite.status})`);

      let authId: string | null =
        typeof invite.auth_id === 'string' ? invite.auth_id : null;

      try {
        const created = await registerAuthUser(user, password);
        authId = created.id;
        steps.push('Registered auth identity');
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          steps.push('Auth identity already exists');
        } else {
          throw err;
        }
      }

      const membership = await setAppMembership(
        authAdminToken,
        user,
        permissionRoles,
      );
      steps.push(`Membership · ${membership.roles.join(', ') || 'none'}`);

      if (!authId) {
        const playerToken = await loginWithPassword(
          user,
          password,
          SUPERIORSIX_AUDIENCE,
        );
        authId = subjectFromJwt(playerToken.access_token);
      }
      if (!authId) {
        throw new Error(
          'Could not resolve auth id after register/membership.',
        );
      }

      const player = await addPlayer(token, {
        auth_id: authId,
        username: user,
        first_name: first,
        last_name: last,
        ...(nick ? { nickname: nick } : {}),
      });
      steps.push(
        `Rostered ${player.first_name} ${player.last_name}` +
          (player.nickname ? ` (${player.nickname})` : ''),
      );

      setNote(steps.join(' → '));
      setUsername('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setNickname('');
      setRoles(DEFAULT_ROLES);
      await refreshRoster();
    } catch (err) {
      const prefix = steps.length ? `${steps.join(' → ')}. Then failed: ` : '';
      if (err instanceof ApiError) {
        setError(`${prefix}${err.message}`);
      } else if (err instanceof Error) {
        setError(`${prefix}${err.message}`);
      } else {
        setError(`${prefix}Invite/roster failed.`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Invite player</Text>
      <Text style={styles.lede}>
        Reserve a username, create their auth identity, set Superior Six
        permissions, and add them to the roster.
      </Text>

      {!authAdminToken ? (
        <Text style={styles.warn}>
          No auth-admin session — membership APIs need a baked-auth admin
          login (bootstrap ops). Re-sign-in with that account.
        </Text>
      ) : null}

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!busy}
        value={username}
        onChangeText={setUsername}
        placeholder="newplayer"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Initial password</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        editable={!busy}
        value={password}
        onChangeText={setPassword}
        placeholder="min 8 characters"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>First name</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="words"
        autoCorrect={false}
        editable={!busy}
        value={firstName}
        onChangeText={setFirstName}
        placeholder="First name"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Last name</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="words"
        autoCorrect={false}
        editable={!busy}
        value={lastName}
        onChangeText={setLastName}
        placeholder="Last name"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Nickname</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="words"
        autoCorrect={false}
        editable={!busy}
        value={nickname}
        onChangeText={setNickname}
        placeholder="Optional"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Permissions</Text>
      <View style={styles.roleRow}>
        {INVITE_PERMISSION_ROLES.map((role) => {
          const on = roles[role];
          return (
            <Pressable
              key={role}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              disabled={busy}
              onPress={() => toggleRole(role)}
              style={({ pressed }) => [
                styles.roleChip,
                on && styles.roleChipOn,
                (pressed || busy) && styles.pressed,
              ]}
            >
              <Text style={[styles.roleChipText, on && styles.roleChipTextOn]}>
                {ROLE_LABELS[role]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {note ? <Text style={styles.saved}>{note}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => {
          void onSubmit();
        }}
        style={({ pressed }) => [
          styles.button,
          (pressed || busy) && styles.pressed,
        ]}
      >
        {busy ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.buttonText}>Invite & roster</Text>
        )}
      </Pressable>

      <View style={styles.rosterBlock}>
        <View style={styles.rosterHeader}>
          <Text style={styles.rosterTitle}>Roster</Text>
          <Pressable
            accessibilityRole="button"
            disabled={rosterLoading || busy}
            onPress={() => {
              void refreshRoster();
            }}
          >
            <Text style={styles.reload}>
              {rosterLoading ? 'Loading…' : 'Reload'}
            </Text>
          </Pressable>
        </View>
        {rosterError ? <Text style={styles.error}>{rosterError}</Text> : null}
        {roster.length === 0 && !rosterLoading && !rosterError ? (
          <Text style={styles.emptyRoster}>No players yet.</Text>
        ) : null}
        {roster.map((player) => (
          <View key={player.auth_id} style={styles.rosterRow}>
            <Text style={styles.rosterName}>
              {player.first_name} {player.last_name}
              {player.nickname ? ` · ${player.nickname}` : ''}
            </Text>
            <Text style={styles.rosterMeta}>
              {player.active ? 'active' : 'inactive'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  roleChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  roleChipOn: {
    borderColor: colors.accentBright,
    backgroundColor: colors.menuActive,
  },
  roleChipText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  roleChipTextOn: {
    color: colors.text,
    fontWeight: '600',
  },
  error: {
    color: '#E8A0A0',
    fontSize: 14,
    marginBottom: 12,
  },
  saved: {
    color: colors.accentBright,
    fontSize: 14,
    lineHeight: 20,
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
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
  rosterBlock: {
    marginTop: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 18,
  },
  rosterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rosterTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  reload: {
    color: colors.accentBright,
    fontSize: 14,
  },
  emptyRoster: {
    color: colors.textMuted,
    fontSize: 14,
  },
  rosterRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rosterName: {
    color: colors.text,
    fontSize: 15,
  },
  rosterMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
