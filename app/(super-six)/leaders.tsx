import { RoundAdminWidget } from '@/features/admin/RoundAdminWidget';
import { useLeadersTabMode } from '@/features/leaders/LeadersTabModeContext';
import { StatsPlayerWidget } from '@/features/stats/StatsPlayerWidget';

/**
 * Leaders tab: player previous-round stats + winners archive (SS-28), or
 * admin Round start/close. Mode swaps in place via LeadersTabModeProvider.
 */
export default function LeadersScreen() {
  const { mode } = useLeadersTabMode();
  if (mode === 'admin') {
    return <RoundAdminWidget />;
  }
  return <StatsPlayerWidget />;
}
