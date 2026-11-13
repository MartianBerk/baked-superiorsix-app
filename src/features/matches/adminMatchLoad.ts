import { listMatches, type AdminMatch } from '@/api/superiorsix';

import {
  adminMatchLoadRanges,
  filterMatchesWithinAdminForwardCap,
} from './formatMatchDate';

/**
 * Load admin fixtures for the date scrubber: game-week Monday through
 * today+{@link ADMIN_MATCH_FORWARD_CAP_DAYS} (UTC), chunked per BE 7-day cap.
 */
export async function loadAdminMatchesForScrubber(
  token: string,
  now: Date = new Date(),
): Promise<AdminMatch[]> {
  const ranges = adminMatchLoadRanges(now);
  const batches = await Promise.all(
    ranges.map((range) => listMatches(token, range)),
  );
  const byId = new Map<number, AdminMatch>();
  for (const batch of batches) {
    for (const match of batch) {
      byId.set(match.id, match);
    }
  }
  const merged = [...byId.values()].sort(
    (a, b) => a.match_date.localeCompare(b.match_date) || a.id - b.id,
  );
  return filterMatchesWithinAdminForwardCap(merged, now);
}
