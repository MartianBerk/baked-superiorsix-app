/** Navigation direction that produced the latest scrubber label change. */
export type ScrubDirection = 'left' | 'right';

/** Short centre-header travel (stays inside the clipped centre slot). */
export const SCRUB_SLIDE_PX = 36;
/**
 * Destination mini-label travel — long enough to read as shooting across
 * into the side slot (sides use overflow:visible so the flight is visible).
 */
export const SCRUB_SHOOT_PX = 180;
/** Fast but still readable hop for centre + mini labels. */
export const SCRUB_SLIDE_MS = 160;
