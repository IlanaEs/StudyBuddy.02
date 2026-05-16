import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

import type {
  LandingFaqItem,
  LandingFaqSection,
} from '../../content/landing/mainLandingContent';

type RoleCard = {
  icon: string;
  title: string;
  note: string;
  cta: string;
  to: string;
};

type TextItem = {
  title: string;
  body: string;
};

type ScreenNavItem = {
  label: string;
  href: string;
  tone?: 'primary';
};

export function LandingHero({
  brand,
  title,
  subtitle,
  context,
  teacherCta,
  children,
}: {
  brand: string;
  title: string;
  subtitle: string;
  context: string;
  teacherCta: { label: string; to: string };
  children: ReactNode;
}) {
  return (
    <section className="landing-section landing-hero" dir="rtl" aria-labelledby="landing-hero-title">
      <MemphisLayer />
      <nav className="landing-nav" aria-label="ניווט ראשי">
        <Link className="brand-lockup" to="/">
          <img alt="StudyBuddy" src="/assets/logo_s.png" />
          <span>{brand}</span>
        </Link>
        <Link className="role-switcher" to={teacherCta.to}>
          {teacherCta.label}
        </Link>
      </nav>
      <div className="hero-grid">
        <FloatingHeroLogo />
        <div className="hero-copy">
          <h1 id="landing-hero-title">{title}</h1>
          <p className="hero-subtitle">{subtitle}</p>
          <p className="hero-context">{context}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

function FloatingHeroLogo() {
  return (
    <div className="floating-logo-stage" aria-label="StudyBuddy">
      <span className="logo-halo logo-halo-cyan" aria-hidden="true" />
      <span className="logo-halo logo-halo-purple" aria-hidden="true" />
      <span className="orbit orbit-one" aria-hidden="true">
        <span />
      </span>
      <span className="orbit orbit-two" aria-hidden="true">
        <span />
      </span>
      <span className="orbit orbit-three" aria-hidden="true">
        <span />
      </span>
      <img className="floating-hero-logo" alt="StudyBuddy" src="/assets/studybuddy-hero-logo.png" />
      <span className="logo-ground-shadow" aria-hidden="true" />
    </div>
  );
}

export function ForkRoleCards({ roles }: { roles: readonly RoleCard[] }) {
  return (
    <div className="role-card-grid" aria-label="בחירת מסלול">
      {roles.map((role) => (
        <Link className="identity-card" key={role.title} to={role.to}>
          <span className="identity-icon" aria-hidden="true">
            {role.icon}
          </span>
          <span className="identity-title">{role.title}</span>
          <span className="identity-note">({role.note})</span>
          <span className="tactile-button">{role.cta}</span>
        </Link>
      ))}
    </div>
  );
}

export function LandingScreenNav({ items }: { items: readonly ScreenNavItem[] }) {
  return (
    <nav className="screen-nav" aria-label="ניווט מקוצר" dir="rtl">
      {items.map((item) => (
        <a
          className={item.tone === 'primary' ? 'sn-btn sn-btn-primary' : 'sn-btn'}
          href={item.href}
          key={`${item.href}-${item.label}`}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

export function BentoAudienceGrid({
  id,
  title,
  subtitle,
  items,
}: {
  id?: string;
  title: string;
  subtitle: string;
  items: readonly TextItem[];
}) {
  return (
    <section className="landing-section" id={id} dir="rtl" aria-labelledby={`${id ?? 'audience'}-title`}>
      <SectionHeader id={`${id ?? 'audience'}-title`} title={title} subtitle={subtitle} />
      <div className="bento-grid">
        {items.map((item, index) => (
          <article className={`bento-card bento-card-${(index % 4) + 1}`} key={item.title}>
            <span className="card-index">{String(index + 1).padStart(2, '0')}</span>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function AudienceListSection({
  id,
  title,
  subtitle,
  items,
}: {
  id?: string;
  title: string;
  subtitle: string;
  items: readonly TextItem[];
}) {
  return (
    <section className="landing-section audience-list-section" id={id} dir="rtl" aria-labelledby="audience-title">
      <div className="audience-list-intro">
        <p className="section-label">StudyBuddy Fit</p>
        <h2 id="audience-title" className="section-title">
          {title}
        </h2>
        <p>{subtitle}</p>
      </div>
      <ol className="audience-list">
        {items.map((item, index) => (
          <li className="audience-list-item" key={item.title}>
            <span className="audience-list-number" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="audience-list-copy">
              <strong>{item.title}</strong>
              <span>{item.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ProcessStepper({
  id,
  title,
  summary,
  steps,
  closing,
}: {
  id?: string;
  title: string;
  summary: string;
  steps: readonly TextItem[];
  closing: string;
}) {
  return (
    <section className="landing-section process-section" id={id} dir="rtl" aria-labelledby="process-title">
      <SectionHeader id="process-title" title={title} subtitle={summary} />
      <div className="process-grid">
        {steps.map((step, index) => (
          <article className="process-card" key={step.title}>
            <span className="step-number">{index + 1}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </article>
        ))}
      </div>
      <p className="process-closing">{closing}</p>
    </section>
  );
}

export function ValueSection({
  id,
  title,
  hook,
  items,
}: {
  id?: string;
  title: string;
  hook: string;
  items: readonly TextItem[];
}) {
  return (
    <section className="landing-section value-section value-manifesto-section" id={id} dir="rtl" aria-labelledby="value-title">
      <div className="value-manifesto-header">
        <p className="section-label">Manifesto</p>
        <h2 id="value-title" className="section-title">
          {title}
        </h2>
        <p>{hook}</p>
      </div>
      <div className="value-manifesto-list">
        {items.map((item, index) => (
          <article className="value-manifesto-row" key={item.title}>
            <div className="value-row-marker">
              <span className="value-row-number">{String(index + 1).padStart(2, '0')}</span>
              <ValueIcon index={index} />
            </div>
            <h3>{item.title}</h3>
            <div className="value-row-copy">
              <p>{item.body}</p>
              <blockquote className={item.body.includes('5 ימים למבחן?') ? 'featured-quote' : undefined}>
                {pullQuote(item.body)}
              </blockquote>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ValueIcon({ index }: { index: number }) {
  const iconIndex = index % 5;

  if (iconIndex === 0) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 3v18M3 12h18" />
        <path d="m8 8 8 8M16 8l-8 8" />
      </svg>
    );
  }

  if (iconIndex === 1) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M5 7h14M5 12h14M5 17h14" />
        <path d="M8 4v16M16 4v16" />
      </svg>
    );
  }

  if (iconIndex === 2) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 3v5l4 2" />
        <circle cx="12" cy="12" r="8" />
        <path d="M12 12h5" />
      </svg>
    );
  }

  if (iconIndex === 3) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 18 10 6l4 8 2-4 4 8" />
        <path d="M4 18h16" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 4 5 8v5c0 4 3 6 7 7 4-1 7-3 7-7V8l-7-4Z" />
      <path d="m9 12 2 2 4-5" />
    </svg>
  );
}

function pullQuote(body: string) {
  if (body.includes('יש לך 5 ימים למבחן?')) {
    return 'יש לך 5 ימים למבחן?';
  }

  const firstSentence = body.split('.')[0] ?? '';
  return firstSentence.trim() || body;
}

export function BrutalComparisonTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: readonly string[];
  rows: readonly (readonly string[])[];
}) {
  return (
    <section className="landing-section" dir="rtl" aria-labelledby="comparison-title">
      <h2 id="comparison-title" className="section-title solo-title">
        {title}
      </h2>
      <div className="comparison-table" role="table" aria-label={title}>
        <div className="comparison-row comparison-head" role="row">
          {columns.map((column) => (
            <div role="columnheader" key={column}>
              {column}
            </div>
          ))}
        </div>
        {rows.map((row) => (
          <div className="comparison-row" role="row" key={row.join('|')}>
            {row.map((cell) => (
              <div role="cell" key={cell}>
                {cell}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export function ParentDashboardPreview({
  title,
  intro,
  items,
}: {
  title: string;
  intro: string;
  items: readonly TextItem[];
}) {
  return (
    <section className="landing-section parent-section" dir="rtl" aria-labelledby="parents-title">
      <div className="parent-copy">
        <h2 id="parents-title">{title}</h2>
        <p>{intro}</p>
        <div className="parent-points">
          {items.map((item) => (
            <article key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </div>
      <aside className="dashboard-preview" aria-label="חשבון משפחתי">
        {items.map((item) => (
          <div className="dashboard-row" key={item.title}>
            <span>{item.title}</span>
            <p>{item.body}</p>
          </div>
        ))}
      </aside>
    </section>
  );
}

export function FAQAccordion({
  id,
  title,
  items,
  sections,
}: {
  id?: string;
  title: string;
  items?: readonly LandingFaqItem[];
  sections?: readonly LandingFaqSection[];
}) {
  return (
    <section className="landing-section faq-section" id={id} dir="rtl" aria-labelledby={`${slug(title)}-title`}>
      <h2 id={`${slug(title)}-title`} className="section-title solo-title">
        {title}
      </h2>
      {items ? (
        <div className="faq-list">
          {items.map((item) => (
            <FAQItem item={item} key={item.question} />
          ))}
        </div>
      ) : null}
      {sections ? (
        <div className="faq-section-list">
          {sections.map((section) => (
            <div className="faq-group" key={section.title}>
              <h3>{section.title}</h3>
              <div className="faq-list">
                {section.items.map((item) => (
                  <FAQItem item={item} key={item.question} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function LandingCTA({ title, label, to }: { title: string; label: string; to: string }) {
  return (
    <section className="landing-section cta-section" dir="rtl" aria-labelledby="landing-cta-title">
      <h2 id="landing-cta-title">{title}</h2>
      <Link className="tactile-button tactile-button-large" to={to}>
        {label}
      </Link>
    </section>
  );
}

export function LegalFooter({
  title,
  items,
  support,
  supportLinks,
}: {
  title: string;
  items: readonly TextItem[];
  support: string;
  supportLinks: string;
}) {
  return (
    <footer className="legal-footer" dir="rtl">
      <h2>{title}</h2>
      <div className="legal-grid">
        {items.map((item) => (
          <article key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
      {support || supportLinks ? (
        <p className="support-line">
          {support}
          <br />
          {supportLinks}
        </p>
      ) : null}
    </footer>
  );
}

type TeacherPlan = {
  name: string;
  icon: string;
  headline: string;
  audience: string;
  price: string;
  commission: string;
  note?: string;
  includesTitle: string;
  includes: readonly string[];
  closing?: string;
  cta: string;
  badge?: string;
};

export function TeacherPricingPlans({
  id,
  title,
  plans,
}: {
  id?: string;
  title: string;
  plans: readonly TeacherPlan[];
}) {
  return (
    <section className="landing-section pricing-section" id={id} dir="rtl" aria-labelledby="teacher-pricing-title">
      <h2 id="teacher-pricing-title" className="section-title solo-title">
        {title}
      </h2>
      <div className="pricing-grid">
        {plans.map((plan) => (
          <article className="pricing-card" key={plan.name}>
            {plan.badge ? <span className="plan-badge">{plan.badge}</span> : null}
            <span className="plan-icon" aria-hidden="true">
              {plan.icon}
            </span>
            <h3>{plan.name}</h3>
            <p className="plan-headline">{plan.headline}</p>
            <p>{plan.audience}</p>
            <strong>{plan.price}</strong>
            <p>{plan.commission}</p>
            {plan.note ? <p className="plan-note">{plan.note}</p> : null}
            <h4>{plan.includesTitle}</h4>
            <ul>
              {plan.includes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {plan.closing ? <p className="plan-closing">{plan.closing}</p> : null}
            <Link className="tactile-button" to="/teacher-onboarding">
              {plan.cta}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function SectionHeader({ id, title, subtitle }: { id?: string; title: string; subtitle: string }) {
  return (
    <header className="section-header">
      <h2 className="section-title" id={id}>
        {title}
      </h2>
      <p>{subtitle}</p>
    </header>
  );
}

function FAQItem({ item }: { item: LandingFaqItem }) {
  return (
    <details className="faq-item">
      <summary>{item.question}</summary>
      <p>{item.answer}</p>
    </details>
  );
}

function MemphisLayer() {
  return (
    <div className="memphis-layer" aria-hidden="true">
      <span className="shape shape-one" />
      <span className="shape shape-two" />
      <span className="shape shape-three" />
      <span className="shape shape-four" />
    </div>
  );
}

function slug(value: string) {
  return value.replace(/\s+/g, '-').replace(/[^\w-]/g, '').toLowerCase() || 'section';
}
