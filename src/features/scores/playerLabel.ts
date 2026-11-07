import type { PlayerProfile } from '@/api/superiorsix';

/** Display name for roster rows — nickname preferred, else full name / email. */
export function playerLabel(player: PlayerProfile): string {
  const nick = player.nickname?.trim();
  if (nick) {
    return nick;
  }
  const name = `${player.first_name} ${player.last_name}`.trim();
  return name || player.email || player.auth_id;
}
