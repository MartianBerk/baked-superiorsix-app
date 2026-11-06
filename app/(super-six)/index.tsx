import { useFixturesTabMode } from '@/features/matches/FixturesTabModeContext';
import { MatchAdminWidget } from '@/features/matches/MatchAdminWidget';
import { MatchPlayerWidget } from '@/features/matches/MatchPlayerWidget';

/**
 * Fixtures tab body: player predictions or admin match-day selector.
 * Mode swaps in place via FixturesTabModeProvider (header + nav stay).
 */
export default function FixturesScreen() {
  const { mode } = useFixturesTabMode();
  if (mode === 'admin') {
    return <MatchAdminWidget />;
  }
  return <MatchPlayerWidget />;
}
