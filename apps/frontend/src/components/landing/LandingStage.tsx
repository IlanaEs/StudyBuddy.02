import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

import { PrimaryButton } from '../../design-system';

/** A decorative element group that dissolves during the Product beat. */
export type DecorLayer = {
  src: string;
  side: 'left' | 'right';
  /** Idle-float keyframe variant; defaults by side (left → a, right → b). */
  floatClass?: 'a' | 'b';
};

export type LandingStageProps = {
  headline: string;
  /** Optional accent line (rendered cyan under the headline). */
  headlineAccent?: string;
  subtitle: string;
  /** Optional muted line under the CTA. */
  context?: string;
  ctaLabel: string;
  ctaTo: string;
  /** `center` (student) or `start` = left-of-centre, leaving the right side as a
   *  product-showcase anchor (teacher). */
  align?: 'center' | 'start';
  /** Decorative groups (student passes 2, teacher passes 1). */
  decorations: DecorLayer[];
};

/**
 * The cinematic, role-agnostic hero stage. A tall scroll track pins the stage
 * (`position: sticky`) so one continuous scroll choreographs three beats:
 *   1. Brand   — only the morphing logo over the fixed world (hero copy hidden).
 *   2. Promise — as the logo retreats into the navbar, headline / sub / CTA reveal
 *                and settle into place; the decorative scene stays present.
 *   3. Product — the hero copy recedes, then the decorative groups dissolve
 *                (fade + blur + part outward) to nothing.
 * Content (copy, decorations) is prop-driven; the persistent world (bg + desk) is
 * rendered fixed by LandingFoundation, and an optional fixed product showcase by
 * LandingShowcase — both behind/around this transparent stage. Driven by a single
 * source (window scrollY) so logo + copy + scene stay in sync (see note below).
 * Respects prefers-reduced-motion (static rest, everything visible, no track).
 */
export function LandingStage({
  headline,
  headlineAccent,
  subtitle,
  context,
  ctaLabel,
  ctaTo,
  align = 'center',
  decorations,
}: LandingStageProps) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  // Drive the whole stage from ONE deterministic source: window scrollY in px
  // (same source as DynamicHeroLogo, so logo + copy + scene stay in sync). NOTE:
  // useScroll({ target }) is intentionally NOT used — in framer-motion 12 it drives
  // `transform` off the measured-target progress but `opacity` off window progress,
  // which desyncs the copy reveal from its movement. Window scrollY avoids that.
  const { scrollY } = useScroll();

  // The sticky stage stays pinned for scrollY ∈ [0, trackHeight − viewportHeight]
  // = [0, 1.8 × innerHeight] (track is 280vh, stage 100vh). The full hero lifecycle
  // is choreographed within this pin window so it all plays while pinned.
  const [pin, setPin] = useState(1600);
  useEffect(() => {
    const update = () => setPin(Math.max(1, Math.round(window.innerHeight * 1.8)));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  const at = (f: number) => Math.round(pin * f); // pin fraction → px

  // Decorative groups belong to BOTH the brand and promise beats: they stay fully
  // present and in place through the entire hero-reading window, then — only after
  // the copy has finished receding (0.70) — part outward, drift up, blur and dim,
  // fully gone by 0.96 (before the pin releases). They dissolve, never slide off.
  const leftX = useTransform(scrollY, [0, at(0.74), pin], ['0%', '0%', '-12%']);
  const rightX = useTransform(scrollY, [0, at(0.74), pin], ['0%', '0%', '12%']);
  const elemY = useTransform(scrollY, [0, at(0.74), pin], ['0%', '0%', '-7%']);
  const elemOpacity = useTransform(scrollY, [0, at(0.74), at(0.96)], [1, 1, 0]);
  const elemBlur = useTransform(scrollY, [at(0.74), at(0.96)], ['blur(0px)', 'blur(6px)']);

  // Hero copy: hidden during the brand beat (logo owns the centre), reveals +
  // settles during the promise beat, holds for reading, then fully recedes — all
  // while the decorative scene is still present.
  const contentOpacity = useTransform(scrollY, [0, at(0.16), at(0.34), at(0.56), at(0.7)], [0, 0, 1, 1, 0]);
  const contentY = useTransform(scrollY, [0, at(0.16), at(0.34), at(0.56), at(0.7)], [36, 36, 0, 0, -40]);
  const hintOpacity = useTransform(scrollY, [0, at(0.1)], [1, 0]);

  const decoStyle = (side: 'left' | 'right') =>
    reduce ? undefined : { x: side === 'left' ? leftX : rightX, y: elemY, opacity: elemOpacity, filter: elemBlur };
  const contentStyle = reduce ? undefined : { y: contentY, opacity: contentOpacity };

  const content = (
    <>
      {/* Decorative groups — gentle float + dissolve on scroll. The fixed world
          (bg + grid + desk, and optional product showcase) shows through. */}
      {decorations.map((d, i) => (
        <motion.div key={`${d.side}-${i}`} className={`ls-layer ls-elem ls-elem-${d.side}`} style={decoStyle(d.side)} aria-hidden>
          <img className={`ls-float ls-float-${d.floatClass ?? (d.side === 'left' ? 'a' : 'b')}`} src={d.src} alt="" />
        </motion.div>
      ))}
      {/* Content — highest layer; scrim behind H1+sub for AA contrast. */}
      <motion.div className={`ls-content${align === 'start' ? ' ls-content--start' : ''}`} style={contentStyle}>
        <div className="ls-scrim" aria-hidden />
        <h1 className="ls-h1">{headline}</h1>
        {headlineAccent ? <h2 className="ls-h2">{headlineAccent}</h2> : null}
        <p className="ls-sub">{subtitle}</p>
        <div className="ls-cta">
          <PrimaryButton onClick={() => navigate(ctaTo)}>{ctaLabel}</PrimaryButton>
        </div>
        {context ? <p className="ls-context">{context}</p> : null}
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
      <section className="ls-stage ls-stage--rest" dir="rtl" lang="he" aria-label="StudyBuddy">
        {content}
      </section>
    );
  }

  // The tall track is the scroll driver; the stage pins to the viewport (sticky).
  return (
    <section className="ls-track" dir="rtl" lang="he" aria-label="StudyBuddy">
      <div className="ls-stage">{content}</div>
    </section>
  );
}
