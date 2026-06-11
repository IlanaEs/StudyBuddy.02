// Default (student) world assets — public URLs (Vite-served).
const DEFAULT_BG = '/images/landing/student/Sticky_Background.svg';
const DEFAULT_DESK = '/images/landing/student/Desk_.svg';

export type LandingFoundationProps = {
  /** Turquoise + grid foundation SVG. Defaults to the student asset. */
  bg?: string;
  /** Desk surface SVG (pinned to the bottom). Defaults to the student asset. */
  desk?: string;
};

/**
 * The permanent foundation of the landing — two TRULY FIXED layers that never
 * move regardless of scroll, behind the entire page:
 *   - lf-bg   (z 0): turquoise + grid.
 *   - lf-desk (z 1): desk surface, pinned to the bottom.
 * Everything else (showcase, hero stage, content, navbar, logo) scrolls/floats
 * above this. Purely presentational and static — no motion, so it persists
 * identically under prefers-reduced-motion. Role-agnostic: pass `bg`/`desk` to
 * point at a different role's asset folder (student and teacher share the look).
 */
export function LandingFoundation({ bg = DEFAULT_BG, desk = DEFAULT_DESK }: LandingFoundationProps = {}) {
  return (
    <div className="landing-foundation" aria-hidden>
      <div className="lf-bg" style={{ backgroundImage: `url(${bg})` }} />
      <div className="lf-desk" style={{ backgroundImage: `url(${desk})` }} />
    </div>
  );
}
