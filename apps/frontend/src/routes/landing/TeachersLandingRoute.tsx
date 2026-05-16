import { Link } from 'react-router-dom';

import {
  BentoAudienceGrid,
  BrutalComparisonTable,
  FAQAccordion,
  LandingCTA,
  LegalFooter,
  LandingScreenNav,
  ProcessStepper,
  TeacherPricingPlans,
  TeacherStatsBar,
  ValueSection,
} from '../../components/landing/LandingComponents';
import { teachersLandingContent } from '../../content/landing/teachersLandingContent';

export function TeachersLandingRoute() {
  const content = teachersLandingContent;

  return (
    <div className="landing-page teacher-page" dir="rtl" lang="he">
      <section className="landing-section teacher-hero teacher-hero-complete" dir="rtl" aria-labelledby="teacher-landing-title">
        <div className="memphis-layer" aria-hidden="true">
          <span className="shape shape-one" />
          <span className="shape shape-two" />
          <span className="shape shape-three" />
          <span className="shape shape-four" />
        </div>
        <nav className="landing-nav" aria-label="ניווט עמוד מורים">
          <Link className="brand-lockup" to="/">
            <img alt="StudyBuddy" src="/assets/logo_s.png" />
            <span>{content.brand}</span>
          </Link>
          <Link className="role-switcher" to={content.hero.secondaryCta.to}>
            {content.hero.secondaryCta.label}
          </Link>
        </nav>
        <div className="teacher-hero-layout">
          <div className="teacher-hero-body">
            <h1 id="teacher-landing-title">{content.hero.title}</h1>
            <p>{content.hero.body}</p>
            <div className="teacher-actions">
              <Link className="tactile-button tactile-button-large" to={content.hero.primaryCta.to}>
                {content.hero.primaryCta.label}
              </Link>
              <Link className="secondary-link" to={content.hero.secondaryCta.to}>
                {content.hero.secondaryCta.label}
              </Link>
            </div>
            <p className="teacher-note">{content.hero.primaryCta.note}</p>
            <TeacherStatsBar stats={content.stats} />
          </div>
          <aside className="teacher-os-preview" aria-label="StudyBuddy OS">
            {content.tools.items.map((tool) => (
              <article key={tool.title}>
                <strong>{tool.title}</strong>
                <span>{tool.body}</span>
              </article>
            ))}
          </aside>
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
          {
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            ),
            text: 'כל מורה עובר אימות ואישור',
          },
          {
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            ),
            text: 'ללא חשיפת מספר טלפון',
          },
          {
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ),
            text: 'דירוגים שקופים מתלמידים אמיתיים',
          },
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
            {
              ...content.tools.items[0],
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              ),
            },
            {
              ...content.tools.items[1],
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              ),
            },
            {
              ...content.tools.items[2],
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="6" />
                  <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
                </svg>
              ),
            },
            {
              ...content.tools.items[3],
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              ),
            },
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
            <p key={item}>{item}</p>
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
  );
}
