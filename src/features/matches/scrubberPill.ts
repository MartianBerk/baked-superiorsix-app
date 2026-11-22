import type { ScrubberSideDensity } from './ScrubberSidePreview';

/** Active-centre pill geometry — scaled to scrubber side density / layout. */
export type ScrubberPillMetrics = {
  /** Cap width; also shrinks to fit the measured centre slot. */
  maxWidth: number;
  minWidth: number;
  height: number;
  radius: number;
  /** Horizontal nudge during scrub morph (iOS). */
  nudgePx: number;
};

/**
 * compact — gameweek / slate / date chips (narrow columns)
 * medium — Profile / Invite / Matches↔Table
 * wide — Performance / Round↔Tournament (full-width)
 */
export const SCRUBBER_PILL_BY_DENSITY: Record<
  ScrubberSideDensity,
  ScrubberPillMetrics
> = {
  compact: { maxWidth: 52, minWidth: 40, height: 24, radius: 8, nudgePx: 5 },
  medium: { maxWidth: 96, minWidth: 72, height: 28, radius: 10, nudgePx: 7 },
  wide: { maxWidth: 132, minWidth: 100, height: 30, radius: 11, nudgePx: 9 },
};
