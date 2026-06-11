import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

export type LandingShowcaseProps = {
  /** The product composition (full-canvas layer, e.g. the laptop/dashboard). */
  src: string;
};

/**
 * The Product Showcase layer — its own category, NOT a decoration. A FIXED,
 * full-canvas layer (the laptop/dashboard = the actual platform) that anchors the
 * composition through the Brand and Promise beats and persists INTO the early
 * Product beat. It begins fading only AFTER the hero→content handoff, so the
 * product stays present longer than the decorative scene around it.
 *
 * The asset is a full 16:9 composition (the laptop placed center-right), rendered
 * cover/center-bottom — the same model as the decoration groups, but at a lower z
 * (above the foundation, below the hero stage) and with a late fade.
 *
 * Driven by the same source as LandingStage/DynamicHeroLogo (window scrollY) and
 * the same pin (1.8 × innerHeight): full opacity through the pin window, then
 * dissolves over [pin, pin × 1.35] — i.e. only once content has handed off.
 * Reduced motion → static, fully visible.
 */
export function LandingShowcase({ src }: LandingShowcaseProps) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();

  const [pin, setPin] = useState(1600);
  useEffect(() => {
    const update = () => setPin(Math.max(1, Math.round(window.innerHeight * 1.8)));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const opacity = useTransform(scrollY, [0, pin, Math.round(pin * 1.35)], [1, 1, 0]);

  if (reduce) {
    return (
      <div className="lf-showcase" aria-hidden>
        <img src={src} alt="" />
      </div>
    );
  }

  return (
    <motion.div className="lf-showcase" style={{ opacity }} aria-hidden>
      <img src={src} alt="" />
    </motion.div>
  );
}
