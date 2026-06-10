import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';

import { BentoCard, DashboardGrid, PrimaryButton } from '../../design-system';
import { mainLandingContent } from '../../content/landing/mainLandingContent';
import type { LandingFaqItem } from '../../content/landing/mainLandingContent';

/** Scroll-into-view fade-up; static when prefers-reduced-motion. */
function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

/** Major section header — bilingual He (En) per CLAUDE.md (headers get English). */
function SectionHeader({ id, he, en, sub }: { id?: string; he: string; en: string; sub?: string }) {
  return (
    <header className="lb-head" id={id}>
      <h2 className="lb-title">
        {he}
        <span className="lb-title-en"> ({en})</span>
      </h2>
      {sub ? <p className="lb-sub">{sub}</p> : null}
    </header>
  );
}

function FaqItem({ item }: { item: LandingFaqItem }) {
  return (
    <details className="lb-faq-item">
      <summary className="lb-faq-q">{item.question}</summary>
      <p className="lb-faq-a">{item.answer}</p>
    </details>
  );
}

export function LandingSections() {
  const navigate = useNavigate();
  const { audience, process, value, comparison, parents, quickFaq, faq, finalCta, legal } = mainLandingContent;

  return (
    <div className="lb-flow">
      {/* AUDIENCE */}
      <section className="lb-section">
        <Reveal><SectionHeader id="audience" he="למי זה מתאים?" en="Who It's For" sub={audience.subtitle} /></Reveal>
        <DashboardGrid>
          {audience.items.map((it, i) => (
            <Reveal key={it.title} delay={i * 0.05}>
              <BentoCard title={it.title} hover><p className="lb-body">{it.body}</p></BentoCard>
            </Reveal>
          ))}
        </DashboardGrid>
      </section>

      {/* PROCESS */}
      <section className="lb-section">
        <Reveal><SectionHeader id="process" he="איך זה עובד?" en="How It Works" sub={process.summary} /></Reveal>
        <DashboardGrid>
          {process.steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.05}>
              <BentoCard title={s.title} hover>
                <span className="lb-step-num data-mono" aria-hidden>{i + 1}</span>
                <p className="lb-body">{s.body}</p>
              </BentoCard>
            </Reveal>
          ))}
        </DashboardGrid>
        <Reveal><p className="lb-caption">{process.closing}</p></Reveal>
      </section>

      {/* VALUE */}
      <section className="lb-section">
        <Reveal><SectionHeader id="value" he="למה StudyBuddy?" en="Why StudyBuddy" sub={value.hook} /></Reveal>
        <Reveal>
          <div className="lb-feature" role="note">
            <span className="lb-feature-quote">יש לך 5 ימים למבחן?</span>
            <span className="lb-feature-sub">אל תבזבז יומיים מהם על חיפוש מורה.</span>
          </div>
        </Reveal>
        <DashboardGrid>
          {value.items.map((it, i) => (
            <Reveal key={it.title} delay={i * 0.05}>
              <BentoCard title={it.title} hover><p className="lb-body">{it.body}</p></BentoCard>
            </Reveal>
          ))}
        </DashboardGrid>
      </section>

      {/* COMPARISON */}
      <section className="lb-section">
        <Reveal><SectionHeader he="למה לעבוד קשה?" en="Before / After" sub={comparison.title} /></Reveal>
        <Reveal>
          <div className="lb-compare" dir="rtl">
            <div className="lb-compare-col lb-compare-before">
              <h3 className="lb-compare-head">{comparison.columns[0]}</h3>
              {comparison.rows.map((r) => <p key={r[0]} className="lb-compare-cell">{r[0]}</p>)}
            </div>
            <div className="lb-compare-col lb-compare-after">
              <h3 className="lb-compare-head">{comparison.columns[1]}</h3>
              {comparison.rows.map((r) => <p key={r[1]} className="lb-compare-cell">{r[1]}</p>)}
            </div>
          </div>
        </Reveal>
      </section>

      {/* PARENTS */}
      <section className="lb-section">
        <Reveal>
          <header className="lb-head">
            <h2 className="lb-title lb-title--quote">להורים מגיע להיות חלק מההצלחה<span className="lb-title-en"> (For Parents)</span></h2>
            <p className="lb-sub">{parents.intro}</p>
          </header>
        </Reveal>
        <DashboardGrid>
          {parents.items.map((it, i) => (
            <Reveal key={it.title} delay={i * 0.05}>
              <BentoCard title={it.title} hover><p className="lb-body">{it.body}</p></BentoCard>
            </Reveal>
          ))}
        </DashboardGrid>
      </section>

      {/* FAQ */}
      <section className="lb-section">
        <Reveal><SectionHeader id="faq" he="שאלות ותשובות" en="FAQ" /></Reveal>
        <div className="lb-faq">
          {quickFaq.items.map((it) => <Reveal key={it.question}><FaqItem item={it} /></Reveal>)}
          {faq.sections.map((sec) => (
            <div key={sec.title} className="lb-faq-group">
              <h3 className="lb-faq-group-title">{sec.title}</h3>
              {sec.items.map((it) => <Reveal key={it.question}><FaqItem item={it} /></Reveal>)}
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="lb-section lb-cta-band">
        <Reveal>
          <h2 className="lb-cta-title">{finalCta.title}</h2>
          <PrimaryButton onClick={() => navigate(finalCta.to)}>אני רוצה להתחיל (Get Started)</PrimaryButton>
        </Reveal>
      </section>

      {/* LEGAL FOOTER */}
      <footer className="lb-footer" dir="rtl" lang="he">
        <h2 className="lb-footer-title">{legal.title}</h2>
        <div className="lb-footer-grid">
          {legal.items.map((it) => (
            <div key={it.title} className="lb-footer-item">
              <h3 className="lb-footer-item-title">{it.title}</h3>
              <p className="lb-footer-item-body">{it.body}</p>
            </div>
          ))}
        </div>
        <p className="lb-footer-support">{legal.support} {legal.supportLinks}</p>
      </footer>
    </div>
  );
}
