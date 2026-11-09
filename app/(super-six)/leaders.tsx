import { useLeadersTabMode } from '@/features/leaders/LeadersTabModeContext';
import { AdminPerformanceHost } from '@/features/side-games/AdminPerformanceHost';
import { StatsPlayerWidget } from '@/features/stats/StatsPlayerWidget';

/**
 * Leaders tab: player previous-round stats + winners archive (SS-28), or
 * admin Round ↔ Tournament (SS-29). Mode swaps in place via
 * LeadersTabModeProvider.
 */
export default function LeadersScreen() {
  const { mode } = useLeadersTabMode();
  if (mode === 'admin') {
    return <AdminPerformanceHost />;
  }
  return <StatsPlayerWidget />;
}
