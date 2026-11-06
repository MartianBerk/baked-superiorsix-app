/**
 * Superior Six theme tokens (SS-8).
 * Background is a very dark blue (not grey). Text is off-white.
 */
export const colors = {
  /** Very dark blue page background */
  background: '#071525',
  /** Slightly lifted surface (header / panels) */
  surface: '#0C1F38',
  /** Bottom menu bar */
  menuBar: '#0A1C30',
  /** Pressed / active menu chip */
  menuActive: '#163556',
  /** Off-white primary text */
  text: '#F2F0E8',
  /** Muted off-white for secondary copy */
  textMuted: '#B8B5A8',
  /** Legacy green accent (icon fill / active) */
  accent: '#116618',
  /** Brighter accent for focus */
  accentBright: '#2E9B4A',
  /**
   * Form / performance result pips + difficulty tiers.
   * Win green matches `accent`; lose is the muted red used by match detail.
   */
  resultWin: '#116618',
  resultLose: '#6B2A2A',
  /** Muted gold for mid difficulty (same family as result greens/reds). */
  difficultyMedium: '#7A6230',
  /** Subtle borders */
  border: '#1A3352',
  /** Floating user button background */
  fab: '#122A48',
} as const;

export type ColorName = keyof typeof colors;
