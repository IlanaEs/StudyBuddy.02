import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

import { PrimaryButton } from '../../design-system';
import { mainLandingContent } from '../../content/landing/mainLandingContent';

// Layered stage assets (public URLs — Vite-served, not base64).
// Foundation = the persistent "world": turquoise + grid (Sticky_Background) and
// the desk surface (Desk_). Element groups = the decorative props that dissolve.
const BG = '/images/landing/student/Sticky_Background.svg';
const DESK = '/images/landing/student/Desk_.svg';
const ELEM_LEFT = '/images/landing/student/Student_Left_Elements.svg';
const ELEM_RIGHT = '/images/landing/student/Student_Right_Elements.svg';

/**
 * The cinematic hero stage. A tall scroll track pins the stage (`position: sticky`)
 * so one continuous scroll choreographs three storytelling beats:
 *   1. Brand   — only the morphing logo over the desk world (hero copy hidden).
 *   2. Promise — as the logo retreats into the navbar, the headline / sub / CTA
 *                reveal and settle into the vacated centre.
 *   3. Product — the decorative element groups + hero copy dissolve (fade + blur +
 *                part outward); the FOUNDATION (bg + grid + desk) persists.
 * Respects prefers-reduced-motion (static rest, everything visible, no track).
 * The morphing logo is rendered by the page (DynamicHeroLogo), above this stage.
 */
export function LandingStage() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  // Element groups: hold full presence through the brand+promise beats, then part
  // outward, drift up, blur and dim — they "dissolve", they never slide off.
  const leftX = useTransform(scrollYProgress, [0, 1], ['0%', '-12%']);
  const rightX = useTransform(scrollYProgress, [0, 1], ['0%', '12%']);
  const elemY = useTransform(scrollYProgress, [0, 1], ['0%', '-7%']);
  const elemOpacity = useTransform(scrollYProgress, [0, 0.58, 0.92], [1, 1, 0.1]);
  const elemBlur = useTransform(scrollYProgress, [0.55, 1], ['blur(0px)', 'blur(6px)']);

  // Hero copy: hidden during the brand beat, reveals + settles into place during
  // the promise beat, then recedes during the product beat.
  const contentOpacity = useTransform(scrollYProgress, [0, 0.16, 0.4, 0.62, 0.85], [0, 0, 1, 1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.16, 0.4, 0.62, 0.85], [36, 36, 0, 0, -40]);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  const { hero } = mainLandingContent;

  const leftStyle = reduce ? undefined : { x: leftX, y: elemY, opacity: elemOpacity, filter: elemBlur };
  const rightStyle = reduce ? undefined : { x: rightX, y: elemY, opacity: elemOpacity, filter: elemBlur };
  const contentStyle = reduce ? undefined : { y: contentY, opacity: contentOpacity };

  const content = (
    <>
      {/* 1. Foundation: turquoise + grid over the deep canvas base (persistent). */}
      <div className="ls-layer ls-bg" style={{ backgroundImage: `url(${BG})` }} aria-hidden />
      {/* 2. Foundation: desk surface, pinned to the bottom (persistent). */}
      <div className="ls-layer ls-desk" style={{ backgroundImage: `url(${DESK})` }} aria-hidden />
      {/* 3. Element groups — decorative props, gentle float + dissolve on scroll. */}
      <motion.div className="ls-layer ls-elem ls-elem-left" style={leftStyle} aria-hidden>
        <img className="ls-float ls-float-a" src={ELEM_LEFT} alt="" />
      </motion.div>
      <motion.div className="ls-layer ls-elem ls-elem-right" style={rightStyle} aria-hidden>
        <img className="ls-float ls-float-b" src={ELEM_RIGHT} alt="" />
      </motion.div>
      {/* 4. Content — highest layer; scrim behind H1+sub for AA contrast. */}
      <motion.div className="ls-content" style={contentStyle}>
        <div className="ls-scrim" aria-hidden />
        <h1 className="ls-h1">המורה המדויק.</h1>
        <h2 className="ls-h2">בלי ניחושים.</h2>
        <p className="ls-sub">{hero.subtitle}</p>
        <div className="ls-cta">
          <PrimaryButton onClick={() => navigate(hero.unifiedCta.to)}>
            מתחילים התאמה (Start Matching)
          </PrimaryButton>
        </div>
        <p className="ls-context">{hero.context}</p>
      </motion.div>
      {!reduce && (
        <motion.div className="ls-scroll-hint" style={{ opacity: hintOpacity }} aria-hidden>
          ↓
        </motion.div>
      )}
    </>
  );

  // Reduced motion: a single static viewport — no scroll track, everything visible.
  if (reduce) {
    return (
      <section ref={ref} className="ls-stage ls-stage--rest" dir="rtl" lang="he" aria-label="StudyBuddy">
        {content}
      </section>
    );
  }

  // The tall track is the scroll driver; the stage pins to the viewport (sticky).
  return (
    <section ref={ref} className="ls-track" dir="rtl" lang="he" aria-label="StudyBuddy">
      <div className="ls-stage">{content}</div>
    </section>
  );
}
