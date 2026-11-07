import { EmptyScreen } from '@/components/shell/EmptyScreen';
import { AdminPredictionsWidget } from '@/features/scores/AdminPredictionsWidget';
import { useScoresTabMode } from '@/features/scores/ScoresTabModeContext';

/**
 * Scores tab body: player scores placeholder or admin on-behalf predictions.
 * Mode swaps in place via ScoresTabModeProvider (header + nav stay).
 */
export default function ScoresScreen() {
  const { mode } = useScoresTabMode();
  if (mode === 'admin') {
    return <AdminPredictionsWidget />;
  }
  return (
    <EmptyScreen
      title="Scores"
      subtitle="Round scores UI comes in a later slice."
    />
  );
}
