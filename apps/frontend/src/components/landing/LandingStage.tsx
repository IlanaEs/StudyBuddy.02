import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

import { PrimaryButton } from '../../design-system';
import { mainLandingContent } from '../../content/landing/mainLandingContent';

// Stage assets (public URLs — Vite-served). Only the decorative element groups
// live here; the persistent foundation (bg + grid + desk) is rendered globally
// and fixed by LandingFoundation, behind this stage.
const ELEM_LEFT = '/images/landing/student/Student_Left_Elements.svg';
const ELEM_RIGHT = '/images/landing/student/Student_Right_Elements.svg';

/**
 * The cinematic hero stage. A tall scroll track pins the stage (`position: sticky`)
 * so one continuous scroll choreographs three storytelling beats:
 *   1. Brand   — only the morphing logo over the desk world (hero copy hidden).
 *   2. Promise — as the logo retreats into the navbar, the headline / sub / CTA
 *                reveal and settle into the vacated centre.
 *   3. Product — the decorative element groups + hero copy dissolve (fade + blur +
 *                part outward) to nothing; the FIXED foundation (LandingFoundation)
 *                stays put underneath.
 * The stage itself is transparent — the fixed turquoise+grid + desk show through.
 * Respects prefers-reduced-motion (static rest, everything visible, no track).
 * The morphing logo is rendered by the page (DynamicHeroLogo), above this stage.
 */
export function LandingStage() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  // Element groups belong to BOTH the brand and promise beats: they stay fully
  // present and in place through the entire hero-reading lifecycle, then — only
  // after the copy has finished receding (≈0.78) — part outward, drift up, blur
  // and dim during the promise→product transition. They dissolve, never slide off.
  const leftX = useTransform(scrollYProgress, [0, 0.8, 1], ['0%', '0%', '-12%']);
  const rightX = useTransform(scrollYProgress, [0, 0.8, 1], ['0%', '0%', '12%']);
  const elemY = useTransform(scrollYProgress, [0, 0.8, 1], ['0%', '0%', '-7%']);
  const elemOpacity = useTransform(scrollYProgress, [0, 0.8, 1], [1, 1, 0]);
  const elemBlur = useTransform(scrollYProgress, [0.8, 1], ['blur(0px)', 'blur(6px)']);

  // Hero copy: hidden during the brand beat (logo owns the centre), reveals +
  // settles into the vacated centre during the promise beat, holds for reading,
  // then fully recedes — all while the decorative scene is still present.
  const contentOpacity = useTransform(scrollYProgress, [0, 0.18, 0.38, 0.6, 0.76], [0, 0, 1, 1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.18, 0.38, 0.6, 0.76], [36, 36, 0, 0, -40]);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.14], [1, 0]);

  const { hero } = mainLandingContent;

  const leftStyle = reduce ? undefined : { x: leftX, y: elemY, opacity: elemOpacity, filter: elemBlur };
  const rightStyle = reduce ? undefined : { x: rightX, y: elemY, opacity: elemOpacity, filter: elemBlur };
  const contentStyle = reduce ? undefined : { y: contentY, opacity: contentOpacity };

  const content = (
    <>
      {/* Element groups — decorative props, gentle float + dissolve on scroll. The
          fixed foundation (bg + grid + desk) shows through from LandingFoundation. */}
      <motion.div className="ls-layer ls-elem ls-elem-left" style={leftStyle} aria-hidden>
        <img className="ls-float ls-float-a" src={ELEM_LEFT} alt="" />
      </motion.div>
      <motion.div className="ls-layer ls-elem ls-elem-right" style={rightStyle} aria-hidden>
        <img className="ls-float ls-float-b" src={ELEM_RIGHT} alt="" />
      </motion.div>
      {/* Content — highest layer; scrim behind H1+sub for AA contrast. */}
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
