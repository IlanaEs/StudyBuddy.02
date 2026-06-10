import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

import { PrimaryButton } from '../../design-system';
import { mainLandingContent } from '../../content/landing/mainLandingContent';

// Layered stage assets (public URLs — Vite-served, not base64).
const BG = '/images/landing/student/student-landing-background-foundation.webp';
const DESK = '/images/landing/student/student-landing-desk-surface.webp';
const ELEM_LEFT = '/images/landing/student/student-landing-decoration-left.webp';
const ELEM_RIGHT = '/images/landing/student/student-landing-decoration-right.webp';

/**
 * The fixed cinematic hero stage (bottom→top: bg over --bg-canvas-deep, desk,
 * element groups, content). On scroll the element groups part outward+up and
 * dim/blur while the hero text recedes; a scrim keeps white text ≥ AA over the glow.
 * Respects prefers-reduced-motion (static rest, no choreography). The morphing
 * logo is rendered by the page (DynamicHeroLogo), above this stage.
 */
export function LandingStage() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  const leftX = useTransform(scrollYProgress, [0, 1], ['0%', '-14%']);
  const rightX = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
  const elemY = useTransform(scrollYProgress, [0, 1], ['0%', '-9%']);
  const elemOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.18]);
  const elemBlur = useTransform(scrollYProgress, [0, 1], ['blur(0px)', 'blur(7px)']);
  const textY = useTransform(scrollYProgress, [0, 0.6], ['0px', '-44px']);
  const textOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  const leftStyle = reduce ? undefined : { x: leftX, y: elemY, opacity: elemOpacity, filter: elemBlur };
  const rightStyle = reduce ? undefined : { x: rightX, y: elemY, opacity: elemOpacity, filter: elemBlur };
  const contentStyle = reduce ? undefined : { y: textY, opacity: textOpacity };

  const { hero } = mainLandingContent;

  return (
    <section ref={ref} className="ls-stage" dir="rtl" lang="he" aria-label="StudyBuddy">
      {/* 1. bg over the deep canvas base (image is NOT flattened to a solid). */}
      <div className="ls-layer ls-bg" style={{ backgroundImage: `url(${BG})` }} aria-hidden />
      {/* 2. desk, anchored bottom, full width. */}
      <div className="ls-layer ls-desk" style={{ backgroundImage: `url(${DESK})` }} aria-hidden />
      {/* 3. element groups — full-canvas layers, gentle float + scroll choreography. */}
      <motion.div className="ls-layer ls-elem ls-elem-left" style={leftStyle} aria-hidden>
        <img className="ls-float ls-float-a" src={ELEM_LEFT} alt="" />
      </motion.div>
      <motion.div className="ls-layer ls-elem ls-elem-right" style={rightStyle} aria-hidden>
        <img className="ls-float ls-float-b" src={ELEM_RIGHT} alt="" />
      </motion.div>
      {/* 4. content — highest layer; scrim behind H1+sub for AA contrast. */}
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
      <div className="ls-scroll-hint" aria-hidden>↓</div>
    </section>
  );
}
