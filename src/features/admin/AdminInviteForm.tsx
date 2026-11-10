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
  formatPermissionRoleLabel,
  getPlayerRoles,
  invitePlayer,
  listInvites,
  listPlayers,
  updatePlayerRoles,
  type InvitePermissionRole,
  type PendingInvite,
  type PlayerProfile,
} from '@/api';
import { useAuth } from '@/auth';
import { colors } from '@/theme';

import { AdminRosterPlayerSection } from './AdminRosterPlayerSection';
import {
  RoleChips,
  emptyRoleFlags,
  type RoleFlags,
} from './roleChips';

const DEFAULT_ROLES: RoleFlags = {
  player: true,
  worldcup: false,
  euros: false,
  admin: false,
};

function selectedRoles(flags: RoleFlags): InvitePermissionRole[] {
  return INVITE_PERMISSION_ROLES.filter((role) => flags[role]);
}

function flagsFromRoles(roles: string[]): RoleFlags {
  const flags = emptyRoleFlags();
  for (const role of roles) {
    const key = role.trim().toLowerCase();
    if ((INVITE_PERMISSION_ROLES as readonly string[]).includes(key)) {
      flags[key as InvitePermissionRole] = true;
    }
  }
  return flags;
}

function formatRolesList(roles: string[]): string {
  const labeled = roles.map(formatPermissionRoleLabel);
  return labeled.length ? labeled.join(', ') : '(no roles)';
}

export type AdminUserPanel = 'invite' | 'roster';

type Props = {
  /** Scrubbed profile-admin screen — invite form or roster only. */
  panel: AdminUserPanel;
};

/**
 * Admin invite form: email + name/nickname seed + role chips.
 * Invite-only — creates passwordless auth user + membership; invitee claims
 * password on first login, then accepts the roster.
 * Roster rows open an in-place role editor (same chips). Any superiorsix
 * admin can grant the app-scoped `admin` role via these chips (SS-98).
 */
export function AdminInviteForm({ panel }: Props) {
  const { token } = useAuth();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
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

  const [editingAuthId, setEditingAuthId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editRoles, setEditRoles] = useState<RoleFlags>(emptyRoleFlags());
  const [editLoading, setEditLoading] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editNote, setEditNote] = useState<string | null>(null);

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

  const toggleEditRole = (role: InvitePermissionRole) => {
    setEditRoles((prev) => ({ ...prev, [role]: !prev[role] }));
    setEditNote(null);
    setEditError(null);
  };

  const closeEditor = () => {
    setEditingAuthId(null);
    setEditEmail('');
    setEditRoles(emptyRoleFlags());
    setEditError(null);
    setEditNote(null);
    setEditLoading(false);
    setEditBusy(false);
  };

  const openEditor = async (player: PlayerProfile) => {
    if (!token) {
      setEditError('Not signed in.');
      return;
    }
    const mail = (player.email ?? '').trim().toLowerCase();
    if (!mail) {
      setEditError('This roster row has no email; roles cannot be edited.');
      setEditingAuthId(player.auth_id);
      setEditEmail('');
      setEditRoles(emptyRoleFlags());
      return;
    }

    setEditingAuthId(player.auth_id);
    setEditEmail(mail);
    setEditError(null);
    setEditNote(null);
    setEditLoading(true);
    try {
      const result = await getPlayerRoles(token, mail);
      setEditRoles(flagsFromRoles(result.roles));
    } catch (err) {
      setEditRoles(emptyRoleFlags());
      if (err instanceof ApiError) {
        setEditError(err.message);
      } else if (err instanceof Error) {
        setEditError(err.message);
      } else {
        setEditError('Could not load roles.');
      }
    } finally {
      setEditLoading(false);
    }
  };

  const onSaveRoles = async () => {
    setEditError(null);
    setEditNote(null);
    if (!token) {
      setEditError('Not signed in.');
      return;
    }
    if (!editEmail) {
      setEditError('Email is required to update roles.');
      return;
    }
    const permissionRoles = selectedRoles(editRoles);
    if (permissionRoles.length === 0) {
      setEditError('Select at least one role (player is typical).');
      return;
    }

    setEditBusy(true);
    try {
      const result = await updatePlayerRoles(token, {
        email: editEmail,
        roles: permissionRoles,
      });
      setEditRoles(flagsFromRoles(result.roles));
      setEditNote(`Updated roles · ${formatRolesList(result.roles)}.`);
    } catch (err) {
      if (err instanceof ApiError) {
        setEditError(err.message);
      } else if (err instanceof Error) {
        setEditError(err.message);
      } else {
        setEditError('Role update failed.');
      }
    } finally {
      setEditBusy(false);
    }
  };

  const onSubmit = async () => {
    setError(null);
    setNote(null);

    const mail = email.trim().toLowerCase();
    const first = firstName.trim();
    const last = lastName.trim();
    const nick = nickname.trim();
    const permissionRoles = selectedRoles(roles);

    if (!mail || !first || !last) {
      setError('Email, first name, and last name are required.');
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
        email: mail,
        first_name: first,
        last_name: last,
        ...(nick ? { nickname: nick } : {}),
        roles: permissionRoles,
      });
      const roleList = formatRolesList(
        invite.roles.length ? invite.roles : permissionRoles,
      );
      setNote(
        `Invited ${invite.email} (${invite.status}) · roles ${roleList}. They set a password on first login (claim), then join.`,
      );
      setEmail('');
      setFirstName('');
      setLastName('');
      setNickname('');
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

  if (panel === 'invite') {
    return (
      <View style={styles.wrap}>
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
        placeholder="Nickname"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Roles</Text>
      <RoleChips value={roles} disabled={busy} onToggle={toggleRole} />

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
          <View key={invite.email} style={styles.listRow}>
            <Text style={styles.listName}>{invite.email}</Text>
            <Text style={styles.listMeta}>
              {formatRolesList(invite.roles.length ? invite.roles : [])}
            </Text>
          </View>
        ))}
      </View>
    </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {rosterLoading && roster.length === 0 ? (
        <ActivityIndicator
          color={colors.textMuted}
          style={styles.rosterLoading}
        />
      ) : null}
      {rosterError ? <Text style={styles.error}>{rosterError}</Text> : null}
      {roster.length === 0 && !rosterLoading && !rosterError ? (
        <Text style={styles.emptyList}>No players yet.</Text>
      ) : null}
      {roster.map((player) => {
        const isEditing = editingAuthId === player.auth_id;
        const rowDisabled =
          busy || ((editBusy || editLoading) && !isEditing);
        return (
          <AdminRosterPlayerSection
            key={player.auth_id}
            player={player}
            expanded={isEditing}
            rowDisabled={rowDisabled}
            onToggleExpand={() => {
              if (isEditing) {
                closeEditor();
                return;
              }
              void openEditor(player);
            }}
            editEmail={isEditing ? editEmail : ''}
            editRoles={isEditing ? editRoles : emptyRoleFlags()}
            editLoading={isEditing && editLoading}
            editBusy={isEditing && editBusy}
            editError={isEditing ? editError : null}
            editNote={isEditing ? editNote : null}
            onToggleEditRole={toggleEditRole}
            onSaveRoles={() => {
              void onSaveRoles();
            }}
            onCloseEditor={closeEditor}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
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
  rosterLoading: {
    paddingVertical: 16,
    alignSelf: 'center',
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
    marginBottom: 8,
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
