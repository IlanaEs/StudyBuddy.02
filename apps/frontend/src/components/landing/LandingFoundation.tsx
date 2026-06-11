// Public URLs (Vite-served). The persistent "world" of the landing experience.
const BG = '/images/landing/student/Sticky_Background.svg';
const DESK = '/images/landing/student/Desk_.svg';

/**
 * The permanent foundation of the landing — two TRULY FIXED layers that never
 * move regardless of scroll, behind the entire page:
 *   - lf-bg   (z 0): Sticky_Background.svg — turquoise + grid.
 *   - lf-desk (z 1): Desk_.svg — desk surface, pinned to the bottom.
 * Everything else (hero stage, content sections, navbar, logo) scrolls/floats
 * above this. Purely presentational and static — no motion, so it persists
 * identically under prefers-reduced-motion.
 */
export function LandingFoundation() {
  return (
    <div className="landing-foundation" aria-hidden>
      <div className="lf-bg" style={{ backgroundImage: `url(${BG})` }} />
      <div className="lf-desk" style={{ backgroundImage: `url(${DESK})` }} />
    </div>
  );
}
