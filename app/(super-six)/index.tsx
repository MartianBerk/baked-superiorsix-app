import { EmptyScreen } from '@/components/shell/EmptyScreen';
import { useFixturesTabMode } from '@/features/matches/FixturesTabModeContext';
import { MatchAdminWidget } from '@/features/matches/MatchAdminWidget';

/**
 * Fixtures tab body: player stub or admin match-day selector.
 * Mode swaps in place via FixturesTabModeProvider (header + nav stay).
 */
export default function FixturesScreen() {
  const { mode } = useFixturesTabMode();
  if (mode === 'admin') {
    return <MatchAdminWidget />;
  }
  return (
    <EmptyScreen
      title="Fixtures"
      subtitle="Predictions UI comes in a later slice."
    />
  );
}
