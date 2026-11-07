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
  INVITE_PERMISSION_ROLE_LABELS,
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

type RoleFlags = Record<InvitePermissionRole, boolean>;

const DEFAULT_ROLES: RoleFlags = {
  player: true,
  worldcup: false,
  euros: false,
};

function emptyRoleFlags(): RoleFlags {
  return {
    player: false,
    worldcup: false,
    euros: false,
  };
}

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

type RoleChipsProps = {
  value: RoleFlags;
  disabled?: boolean;
  onToggle: (role: InvitePermissionRole) => void;
};

function RoleChips({ value, disabled, onToggle }: RoleChipsProps) {
  return (
    <View style={styles.roleRow}>
      {INVITE_PERMISSION_ROLES.map((role) => {
        const on = value[role];
        return (
          <Pressable
            key={role}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            disabled={disabled}
            onPress={() => onToggle(role)}
            style={({ pressed }) => [
              styles.roleChip,
              on && styles.roleChipOn,
              (pressed || disabled) && styles.pressed,
            ]}
          >
            <Text style={[styles.roleChipText, on && styles.roleChipTextOn]}>
              {INVITE_PERMISSION_ROLE_LABELS[role]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Admin invite form: email + name/nickname seed + role chips.
 * Invite-only — creates passwordless auth user + membership; invitee claims
 * password on first login, then accepts the roster.
 * Roster rows open an in-place role editor (same chips). Game admin ops use
 * the superiorsix `admin` membership role (bootstrap / direct auth only).
 */
export function AdminInviteForm() {
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

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Invite player</Text>
      <Text style={styles.lede}>
        Reserve an email, profile seed, and roles. Profile edit access is always
        granted. Auth user + membership are created now; the invitee sets a
        password on first login, then joins the roster. Game admin access uses
        the superiorsix admin membership role (bootstrap / direct auth only) —
        it is not assignable from these chips.
      </Text>

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

      <View style={styles.listBlock}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Roster</Text>
          <Pressable
            accessibilityRole="button"
            disabled={rosterLoading || busy || editBusy}
            onPress={() => {
              void refreshRoster();
            }}
          >
            <Text style={styles.reload}>
              {rosterLoading ? 'Loading…' : 'Reload'}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.listHint}>Tap a player to edit roles.</Text>
        {rosterError ? <Text style={styles.error}>{rosterError}</Text> : null}
        {roster.length === 0 && !rosterLoading && !rosterError ? (
          <Text style={styles.emptyList}>No players yet.</Text>
        ) : null}
        {roster.map((player) => {
          const isEditing = editingAuthId === player.auth_id;
          return (
            <View key={player.auth_id} style={styles.listRow}>
              <Pressable
                accessibilityRole="button"
                disabled={busy || editBusy || editLoading}
                onPress={() => {
                  if (isEditing) {
                    closeEditor();
                    return;
                  }
                  void openEditor(player);
                }}
              >
                <Text style={styles.listName}>
                  {player.first_name} {player.last_name}
                  {player.nickname ? ` · ${player.nickname}` : ''}
                </Text>
                <Text style={styles.listMeta}>
                  {player.email ? `${player.email} · ` : ''}
                  {player.active ? 'active' : 'inactive'}
                  {isEditing ? ' · editing' : ''}
                </Text>
              </Pressable>

              {isEditing ? (
                <View style={styles.editPanel}>
                  <Text style={styles.label}>Email</Text>
                  <Text style={styles.emailReadonly}>
                    {editEmail || '(no email)'}
                  </Text>

                  <Text style={styles.label}>Roles</Text>
                  {editLoading ? (
                    <ActivityIndicator
                      color={colors.textMuted}
                      style={styles.editSpinner}
                    />
                  ) : (
                    <RoleChips
                      value={editRoles}
                      disabled={editBusy || !editEmail}
                      onToggle={toggleEditRole}
                    />
                  )}

                  {editError ? (
                    <Text style={styles.error}>{editError}</Text>
                  ) : null}
                  {editNote ? (
                    <Text style={styles.saved}>{editNote}</Text>
                  ) : null}

                  <View style={styles.editActions}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={editBusy || editLoading || !editEmail}
                      onPress={() => {
                        void onSaveRoles();
                      }}
                      style={({ pressed }) => [
                        styles.button,
                        styles.editSave,
                        (pressed || editBusy || editLoading || !editEmail) &&
                          styles.pressed,
                      ]}
                    >
                      {editBusy ? (
                        <ActivityIndicator color={colors.text} />
                      ) : (
                        <Text style={styles.buttonText}>Save roles</Text>
                      )}
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={editBusy}
                      onPress={closeEditor}
                      style={({ pressed }) => [
                        styles.cancelButton,
                        (pressed || editBusy) && styles.pressed,
                      ]}
                    >
                      <Text style={styles.cancelText}>Close</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
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
  emailReadonly: {
    color: colors.text,
    fontSize: 16,
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
    marginBottom: 8,
  },
  listTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  listHint: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 12,
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
  editPanel: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  editSpinner: {
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  editActions: {
    gap: 10,
  },
  editSave: {
    marginTop: 0,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelText: {
    color: colors.accentBright,
    fontSize: 15,
    fontWeight: '500',
  },
});
