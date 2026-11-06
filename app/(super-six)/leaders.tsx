import { EmptyScreen } from '@/components/shell/EmptyScreen';
import { RoundAdminWidget } from '@/features/admin/RoundAdminWidget';
import { useLeadersTabMode } from '@/features/leaders/LeadersTabModeContext';

/**
 * Leaders tab body: player leaderboard placeholder or admin Round start/close.
 * Mode swaps in place via LeadersTabModeProvider (header + nav stay).
 */
export default function LeadersScreen() {
  const { mode } = useLeadersTabMode();
  if (mode === 'admin') {
    return <RoundAdminWidget />;
  }
  return (
    <EmptyScreen
      title="Leaders"
      subtitle="Leaderboard UI comes in a later slice."
    />
  );
}
