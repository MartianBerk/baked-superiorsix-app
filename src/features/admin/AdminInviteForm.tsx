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
  invitePlayer,
  listInvites,
  listPlayers,
  type InvitePermissionRole,
  type PendingInvite,
  type PlayerProfile,
} from '@/api';
import { useAuth } from '@/auth';
import { colors } from '@/theme';

const ROLE_LABELS: Record<InvitePermissionRole, string> = {
  player: 'Player',
  worldcup: 'World Cup',
  euros: 'Euros',
};

type RoleFlags = Record<InvitePermissionRole, boolean>;

const DEFAULT_ROLES: RoleFlags = {
  player: true,
  worldcup: false,
  euros: false,
};

function selectedRoles(flags: RoleFlags): InvitePermissionRole[] {
  return INVITE_PERMISSION_ROLES.filter((role) => flags[role]);
}

/**
 * Admin invite form: username + name seed + role chips.
 * Invite-only — invitee sets password on first login; roles grant on accept.
 */
export function AdminInviteForm() {
  const { token } = useAuth();
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<RoleFlags>(DEFAULT_ROLES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [invitesError, setInvitesError] = useState<string | null>(null);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [roster, setRoster] = useState<PlayerProfile[]>([]);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);

  const refreshInvites = useCallback(async () => {
    if (!token) {
      setInvites([]);
      return;
    }
    setInvitesLoading(true);
    setInvitesError(null);
    try {
      setInvites(await listInvites(token));
    } catch (err) {
      setInvitesError(
        err instanceof Error ? err.message : 'Could not load invites.',
      );
    } finally {
      setInvitesLoading(false);
    }
  }, [token]);

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

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshInvites(), refreshRoster()]);
  }, [refreshInvites, refreshRoster]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

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
    const mail = email.trim();
    const permissionRoles = selectedRoles(roles);

    if (!user || !first || !last || !mail) {
      setError('Username, first name, last name, and email are required.');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,64}$/.test(user)) {
      setError('Username must be 3–64 letters, numbers, or underscores.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!token) {
      setError('Not signed in.');
      return;
    }
    if (permissionRoles.length === 0) {
      setError('Select at least one role (player is typical).');
      return;
    }

    setBusy(true);
    try {
      const invite = await invitePlayer(token, {
        username: user,
        first_name: first,
        last_name: last,
        email: mail,
        roles: permissionRoles,
      });
      const roleList =
        (invite.roles.length ? invite.roles : permissionRoles).join(', ') ||
        'none';
      setNote(
        `Invited ${invite.username} (${invite.status}) · roles ${roleList}. They set a password on first login.`,
      );
      setUsername('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setRoles(DEFAULT_ROLES);
      await refreshAll();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Invite failed.');
      }
    } finally {
      setBusy(false);
    }
  };

  const pendingInvites = invites.filter((invite) => invite.status === 'pending');

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Invite player</Text>
      <Text style={styles.lede}>
        Reserve a username, email, and roles. Profile edit access is always
        granted. The invitee chooses a password on first login; roles apply when
        they accept — no second admin pass.
      </Text>

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

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        editable={!busy}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Roles</Text>
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
          <Text style={styles.buttonText}>Send invite</Text>
        )}
      </Pressable>

      <View style={styles.listBlock}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Pending invites</Text>
          <Pressable
            accessibilityRole="button"
            disabled={invitesLoading || busy}
            onPress={() => {
              void refreshInvites();
            }}
          >
            <Text style={styles.reload}>
              {invitesLoading ? 'Loading…' : 'Reload'}
            </Text>
          </Pressable>
        </View>
        {invitesError ? <Text style={styles.error}>{invitesError}</Text> : null}
        {pendingInvites.length === 0 && !invitesLoading && !invitesError ? (
          <Text style={styles.emptyList}>No pending invites.</Text>
        ) : null}
        {pendingInvites.map((invite) => (
          <View key={invite.username} style={styles.listRow}>
            <Text style={styles.listName}>{invite.username}</Text>
            <Text style={styles.listMeta}>
              {(invite.roles.length ? invite.roles : ['(no roles)']).join(', ')}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.listBlock}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Roster</Text>
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
          <Text style={styles.emptyList}>No players yet.</Text>
        ) : null}
        {roster.map((player) => (
          <View key={player.auth_id} style={styles.listRow}>
            <Text style={styles.listName}>
              {player.first_name} {player.last_name}
              {player.nickname ? ` · ${player.nickname}` : ''}
            </Text>
            <Text style={styles.listMeta}>
              {player.email ? `${player.email} · ` : ''}
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
  listBlock: {
    marginTop: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 18,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  listTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  reload: {
    color: colors.accentBright,
    fontSize: 14,
  },
  emptyList: {
    color: colors.textMuted,
    fontSize: 14,
  },
  listRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  listName: {
    color: colors.text,
    fontSize: 15,
  },
  listMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
