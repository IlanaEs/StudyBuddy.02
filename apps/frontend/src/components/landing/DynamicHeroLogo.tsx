import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

/** Optimized vector logo (scales cleanly across the morph). Public URL ref. */
const LOGO_SRC = '/assets/studybuddy-logo-full.svg';

/**
 * The single, never-duplicated hero logo (`#dynamic-hero-logo`, z-index 100).
 * Scroll 0 → large, centred above the H1; scrolling shrinks it (scale 1→0.4,
 * transform-origin top-right) and flies it into the top-right navbar slot (RTL).
 * Threshold: 300px desktop / 150px mobile, re-derived on resize. framer-motion
 * is bundled (no CDN), so the morph can't fail to load. `prefers-reduced-motion`
 * → static rest state, no choreography.
 */
export function DynamicHeroLogo() {
  const reduce = useReducedMotion();
  const [end, setEnd] = useState(300);
  const { scrollY } = useScroll();

  // Re-derive the scroll end on viewport change (the reference's invalidateOnRefresh).
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setEnd(mq.matches ? 150 : 300);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Anchored top-right; at scroll 0 it's translated toward centre + down and full
  // scale, settling to the top-right slot by `end`. vw/vh keep it responsive.
  const scale = useTransform(scrollY, [0, end], [1, 0.4], { clamp: true });
  const x = useTransform(scrollY, [0, end], ['-42vw', '-1.5vw'], { clamp: true });
  const y = useTransform(scrollY, [0, end], ['18vh', '0.8vh'], { clamp: true });

  if (reduce) {
    return (
      <div id="dynamic-hero-logo" className="dynamic-hero-logo dynamic-hero-logo--rest">
        <img src={LOGO_SRC} alt="StudyBuddy" />
      </div>
    );
  }

  return (
    <motion.div id="dynamic-hero-logo" className="dynamic-hero-logo" style={{ x, y, scale }}>
      <img src={LOGO_SRC} alt="StudyBuddy" />
    </motion.div>
  );
}
