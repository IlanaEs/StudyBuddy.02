export const motionDurations = {
  quick: 150,
  base: 220,
  calm: 320,
} as const;

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
