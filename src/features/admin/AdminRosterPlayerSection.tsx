import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SvgXml } from 'react-native-svg';

import type { InvitePermissionRole, PlayerProfile } from '@/api';
import { scoreListChrome } from '@/features/scores/scoreListChrome';
import { colors } from '@/theme';

import { RoleChips, type RoleFlags } from './roleChips';

const CHEVRON_DOWN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
const CHEVRON_UP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`;

type Props = {
  player: PlayerProfile;
  expanded: boolean;
  rowDisabled: boolean;
  onToggleExpand: () => void;
  editEmail: string;
  editRoles: RoleFlags;
  editLoading: boolean;
  editBusy: boolean;
  editError: string | null;
  editNote: string | null;
  accountBusy: boolean;
  accountError: string | null;
  accountNote: string | null;
  onToggleEditRole: (role: InvitePermissionRole) => void;
  onSaveRoles: () => void;
  onResetPassword: () => void;
  onToggleActive: () => void;
  onCloseEditor: () => void;
};

function playerLabel(player: PlayerProfile): string {
  const base = `${player.first_name} ${player.last_name}`.trim();
  return player.nickname ? `${base} · ${player.nickname}` : base;
}

/**
 * One roster player: tap row to expand role editor (Scores/Matches section card).
 */
export function AdminRosterPlayerSection({
  player,
  expanded,
  rowDisabled,
  onToggleExpand,
  editEmail,
  editRoles,
  editLoading,
  editBusy,
  editError,
  editNote,
  accountBusy,
  accountError,
  accountNote,
  onToggleEditRole,
  onSaveRoles,
  onResetPassword,
  onToggleActive,
  onCloseEditor,
}: Props) {
  const panelBusy = editBusy || editLoading || accountBusy;
  const chevron = (expanded ? CHEVRON_UP : CHEVRON_DOWN).replaceAll(
    'CURRENT',
    colors.textMuted,
  );
  const displayName = playerLabel(player);

  return (
    <View style={scoreListChrome.sectionCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded
            ? `Collapse ${displayName}`
            : `Expand ${displayName} to edit roles`
        }
        disabled={rowDisabled}
        onPress={onToggleExpand}
        style={({ pressed }) => [
          styles.row,
          pressed && !rowDisabled && styles.rowPressed,
        ]}
      >
        <View style={styles.leading}>
          <Text style={styles.name} numberOfLines={2}>
            {displayName}
          </Text>
          <Text style={styles.meta} numberOfLines={2}>
            {player.email ? `${player.email} · ` : ''}
            {player.active ? 'active' : 'inactive'}
          </Text>
        </View>
        <View style={styles.chevronSlot}>
          <SvgXml xml={chevron} width={18} height={18} />
        </View>
      </Pressable>

      {expanded ? (
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
              disabled={panelBusy || !editEmail}
              onToggle={onToggleEditRole}
            />
          )}

          <Text style={styles.label}>Account</Text>
          <View style={styles.accountRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset password for first login"
              disabled={panelBusy || !editEmail}
              onPress={onResetPassword}
              style={({ pressed }) => [
                styles.accountButton,
                (pressed || panelBusy || !editEmail) && styles.pressed,
                (panelBusy || !editEmail) && styles.accountButtonDisabled,
              ]}
            >
              <Text style={styles.accountButtonText}>Reset password</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                player.active ? 'Mark player inactive' : 'Reactivate player'
              }
              disabled={panelBusy}
              onPress={onToggleActive}
              style={({ pressed }) => [
                styles.accountButton,
                player.active && styles.accountButtonWarn,
                (pressed || panelBusy) && styles.pressed,
                panelBusy && styles.accountButtonDisabled,
              ]}
            >
              <Text style={styles.accountButtonText}>
                {player.active ? 'Mark inactive' : 'Reactivate'}
              </Text>
            </Pressable>
          </View>

          {editError ? <Text style={styles.error}>{editError}</Text> : null}
          {editNote ? <Text style={styles.saved}>{editNote}</Text> : null}
          {accountError ? (
            <Text style={styles.error}>{accountError}</Text>
          ) : null}
          {accountNote ? <Text style={styles.saved}>{accountNote}</Text> : null}

          <View style={styles.editActions}>
            <Pressable
              accessibilityRole="button"
              disabled={panelBusy || !editEmail}
              onPress={onSaveRoles}
              style={({ pressed }) => [
                styles.button,
                (pressed || panelBusy || !editEmail) && styles.pressed,
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
              disabled={panelBusy}
              onPress={onCloseEditor}
              style={({ pressed }) => [
                styles.cancelButton,
                (pressed || panelBusy) && styles.pressed,
              ]}
            >
              <Text style={styles.cancelText}>Close</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.menuBar,
  },
  rowPressed: {
    backgroundColor: colors.menuActive,
  },
  leading: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  chevronSlot: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  editPanel: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  emailReadonly: {
    color: colors.text,
    fontSize: 16,
    marginBottom: 14,
  },
  editSpinner: {
    marginBottom: 16,
    alignSelf: 'flex-start',
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
  accountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  accountButton: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  accountButtonWarn: {
    borderColor: colors.resultLose,
  },
  accountButtonDisabled: {
    opacity: 0.45,
  },
  accountButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  editActions: {
    gap: 10,
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
