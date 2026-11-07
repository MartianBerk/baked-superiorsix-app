import type { LiveMatch, PredictionChoice } from '@/api/superiorsix';

import {
  hasKickedOff,
  isFinishedStatus,
  isPlayingStatus,
  isPostponedStatus,
} from './liveScoreDisplay';

export const PICK_BADGE_LABEL: Record<PredictionChoice, string> = {
  home: 'H',
  draw: 'D',
  away: 'A',
};

export function outcomeFromScores(
  homeScore: number,
  awayScore: number,
): PredictionChoice {
  if (homeScore > awayScore) {
    return 'home';
  }
  if (homeScore < awayScore) {
    return 'away';
  }
  return 'draw';
}

/** True once the score line leaves `- : -` (kickoff / in-play / finished). */
export function scoresHaveStarted(
  match: Pick<LiveMatch, 'match_date' | 'status'>,
  now: Date = new Date(),
): boolean {
  if (isPostponedStatus(match.status)) {
    return false;
  }
  return (
    hasKickedOff(match.match_date, now) ||
    isPlayingStatus(match.status) ||
    isFinishedStatus(match.status)
  );
}

/**
 * Grey until scores start; green only while the pick matches the live scoreline
 * (null scores at kickoff count as 0–0).
 */
export function isPickCurrentlyCorrect(
  prediction: PredictionChoice | null | undefined,
  match: Pick<LiveMatch, 'match_date' | 'status' | 'home_score' | 'away_score'>,
  now: Date = new Date(),
): boolean {
  if (prediction == null) {
    return false;
  }
  if (!scoresHaveStarted(match, now)) {
    return false;
  }
  return (
    prediction ===
    outcomeFromScores(match.home_score ?? 0, match.away_score ?? 0)
  );
}
