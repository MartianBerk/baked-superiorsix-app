import { AdminPredictionsWidget } from '@/features/scores/AdminPredictionsWidget';
import { ScoresPlayerWidget } from '@/features/scores/ScoresPlayerWidget';
import { useScoresTabMode } from '@/features/scores/ScoresTabModeContext';

/**
 * Scores tab body: player gameday scoreboard or admin on-behalf predictions.
 * Mode swaps in place via ScoresTabModeProvider (header + nav stay).
 */
export default function ScoresScreen() {
  const { mode } = useScoresTabMode();
  if (mode === 'admin') {
    return <AdminPredictionsWidget />;
  }
  return <ScoresPlayerWidget />;
}
