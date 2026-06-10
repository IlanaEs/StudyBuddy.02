import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Star, Calendar, DollarSign, Award, Target, X } from 'lucide-react';

import {
  BentoAudienceGrid,
  BrutalComparisonTable,
  FAQAccordion,
  LandingCTA,
  LegalFooter,
  LandingScreenNav,
  ProcessStepper,
  TeacherPricingPlans,
  ValueSection,
} from '../../components/landing/LandingComponents';
import { teachersLandingContent } from '../../content/landing/teachersLandingContent';

const teacherLandingAssets = {
  // Shared persistent foundation (turquoise + grid), matching the student stage.
  background: '/images/landing/teacher/Sticky_Background.svg',
  decorationLeft: '/images/landing/teacher/teacher-landing-decoration-left.png',
  productMockup: '/images/landing/teacher/teacher-landing-product-mockup-right.png',
} as const;

// Layer 0 — the frozen "desk world": dark teal canvas + foundation and the
// decorative side prop/laptop framing the content. Rendered fixed and inert so it
// never moves while Layer 1 scrolls over it.
function TeacherDepthBackground() {
  return (
    <div className="teacher-depth-background" aria-hidden="true">
      <div
        className="teacher-depth-canvas"
        style={{ backgroundImage: `url(${teacherLandingAssets.background})` }}
      />
      <img className="teacher-depth-prop teacher-depth-prop-left" src={teacherLandingAssets.decorationLeft} alt="" />
      <img className="teacher-depth-prop teacher-depth-prop-mockup" src={teacherLandingAssets.productMockup} alt="" />
    </div>
  );
}

export function TeachersLandingRoute() {
  const content = teachersLandingContent;
  const contentRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // Drive the sticky-nav scroll state from Layer 1's own scroll position
  // (Layer 1 is the scroll container; the document/body does not scroll here).
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return undefined;
    const handleScroll = () => setIsScrolled(el.scrollTop > 8);
    handleScroll();
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <main className="teacher-landing-depth-page teacher-page" dir="rtl" lang="he">
      {/* Layer 0 — static background world */}
      <TeacherDepthBackground />

      {/* Layer 1 — scrollable foreground content */}
      <div className="teacher-depth-content" ref={contentRef}>
        {/* Layer 2 — sticky glass navbar */}
        <nav
          className="teacher-depth-nav"
          data-scrolled={isScrolled ? 'true' : 'false'}
          dir="rtl"
          aria-label="ניווט עמוד מורים"
        >
          <Link className="brand-lockup" to="/">
            <img alt="StudyBuddy" src="/assets/logo_s.png" />
            <span>{content.brand}</span>
          </Link>
          <div className="teacher-depth-nav-links">
            <Link className="role-switcher" to={content.hero.secondaryCta.to}>
              {content.hero.secondaryCta.label}
            </Link>
            <Link className="role-switcher" style={{ opacity: 0.75 }} to="/login">
              כניסה למערכת
            </Link>
          </div>
        </nav>

        <section className="teacher-hero teacher-hero-complete" dir="rtl" aria-labelledby="teacher-landing-title">
          <div className="teacher-hero-layout">
            <h1 id="teacher-landing-title">
              הופכים את ההוראה הפרטית<br />
              לקריירה <span className="teacher-accent">מנוהלת</span>.
            </h1>
            <p className="teacher-hero-subtitle">{content.hero.body}</p>
            <div className="teacher-hero-ctas">
              <Link className="teacher-cta-primary" to={content.hero.primaryCta.to}>
                {content.hero.primaryCta.label}
              </Link>
              <Link className="teacher-cta-secondary" to={content.hero.secondaryCta.to}>
                {content.hero.secondaryCta.label}
              </Link>
            </div>
          </div>
        </section>

        <LandingScreenNav
          items={[
            { label: 'איך זה עובד', href: '#teacher-process' },
            { label: content.tools.title, href: '#teacher-tools' },
            { label: content.plans.title, href: '#teacher-plans' },
            { label: content.faq.title, href: '#teacher-faq' },
            { label: content.hero.secondaryCta.label, href: content.hero.secondaryCta.to, tone: 'primary' },
          ]}
        />

        <ProcessStepper
          id="teacher-process"
          title={content.process.title}
          summary="איך זה עובד?"
          steps={content.process.steps}
          closing={content.onboarding.body}
        />

        <ValueSection id="teacher-value" title={content.value.title} hook="הערך למורה" items={content.value.items} />

        <section className="landing-section comparison-shell" dir="rtl" aria-labelledby="teacher-comparison-label">
          <p id="teacher-comparison-label" className="section-label">
            {content.comparison.label}
          </p>
          <BrutalComparisonTable
            title={content.comparison.title}
            columns={content.comparison.columns}
            rows={content.comparison.rows}
          />
        </section>

        <section className="teacher-trust-strip" dir="rtl" aria-label="אמינות המערכת">
          {[
            { icon: <Shield size={18} />, text: 'כל מורה עובר אימות ואישור' },
            { icon: <Lock size={18} />, text: 'ללא חשיפת מספר טלפון' },
            { icon: <Star size={18} />, text: 'דירוגים שקופים מתלמידים אמיתיים' },
          ].map((item) => (
            <div className="trust-pill" key={item.text}>
              <span className="trust-pill-icon">{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </section>

        <section className="landing-section teacher-tools-section" id="teacher-tools" dir="rtl" aria-labelledby="tools-title">
          <header className="section-header">
            <h2 className="section-title" id="tools-title">{content.tools.title}</h2>
            <p>The OS Features</p>
          </header>
          <div className="teacher-tools-grid">
            {[
              { ...content.tools.items[0], icon: <Calendar size={24} /> },
              { ...content.tools.items[1], icon: <DollarSign size={24} /> },
              { ...content.tools.items[2], icon: <Award size={24} /> },
              { ...content.tools.items[3], icon: <Target size={24} /> },
            ].map((tool) => (
              <article className="teacher-tool-card" key={tool.title}>
                <span className="tool-icon">{tool.icon}</span>
                <strong>{tool.title}</strong>
                <p>{tool.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section stop-section" dir="rtl" aria-labelledby="stop-title">
          <h2 id="stop-title" className="section-title solo-title">
            {content.stopDoing.title}
          </h2>
          <div className="stop-grid">
            {content.stopDoing.items.map((item) => (
              <p key={item} className="flex items-start gap-2">
                <X size={16} style={{ color: 'var(--coral)', flexShrink: 0, marginTop: 3 }} />
                <span>{item}</span>
              </p>
            ))}
          </div>
        </section>

        <BentoAudienceGrid id="teacher-audience" title={content.audience.title} subtitle="Teacher Types" items={content.audience.items} />

        <section className="landing-section onboarding-section" dir="rtl" aria-labelledby="onboarding-title">
          <p className="section-label">{content.onboarding.label}</p>
          <h2 id="onboarding-title">{content.onboarding.title}</h2>
          <p>{content.onboarding.body}</p>
        </section>

        <TeacherPricingPlans id="teacher-plans" title={content.plans.title} plans={content.plans.items} />

        <section className="landing-section plan-fit-section" dir="rtl" aria-labelledby="plan-fit-title">
          <BrutalComparisonTable
            title={content.planFit.title}
            columns={content.planFit.columns}
            rows={content.planFit.rows}
          />
          <div className="plan-notes">
            {content.planFit.notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </section>

        <FAQAccordion id="teacher-faq" title={content.faq.title} sections={content.faq.sections} />

        <LandingCTA
          title={content.finalCta.title}
          label={content.finalCta.label}
          to={content.finalCta.to}
        />

        <LegalFooter title={content.legal.title} items={content.legal.items} support="" supportLinks="" />
      </div>
    </main>
  );
}
