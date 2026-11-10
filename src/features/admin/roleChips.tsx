import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  INVITE_PERMISSION_ROLE_LABELS,
  INVITE_PERMISSION_ROLES,
  type InvitePermissionRole,
} from '@/api';
import { colors } from '@/theme';

export type RoleFlags = Record<InvitePermissionRole, boolean>;

type Props = {
  value: RoleFlags;
  disabled?: boolean;
  onToggle: (role: InvitePermissionRole) => void;
};

export function RoleChips({ value, disabled, onToggle }: Props) {
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

const styles = StyleSheet.create({
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
  pressed: {
    opacity: 0.85,
  },
});

export function emptyRoleFlags(): RoleFlags {
  return {
    player: false,
    worldcup: false,
    euros: false,
    admin: false,
  };
}
