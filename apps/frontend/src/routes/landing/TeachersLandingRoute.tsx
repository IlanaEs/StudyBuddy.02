import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Star, Calendar, DollarSign, Award, Target, X } from 'lucide-react';

import { FloatingTopNavbar, GhostButton, SecondaryButton } from '../../design-system';
import { LandingFoundation } from '../../components/landing/LandingFoundation';
import { LandingShowcase } from '../../components/landing/LandingShowcase';
import { DynamicHeroLogo } from '../../components/landing/DynamicHeroLogo';
import { LandingStage } from '../../components/landing/LandingStage';
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

// Teacher world + three visual tiers (all full-canvas 1366×768 layers).
const TEACHER_ASSETS = {
  bg: '/images/landing/teacher/Sticky_Background.svg',
  desk: '/images/landing/teacher/Desk_.svg',
  // Decoration — atmosphere (dissolves during the Product beat, like the student decorations).
  decorationLeft: '/images/landing/teacher/teacher-landing-decoration-left.png', // plant · notebooks · pen
  decorationRight: '/images/landing/teacher/Teacher_Right_Elements.png', // cup · desk accessories
  // Product Showcase — the platform itself (laptop + dashboard); persists past the hero, fades late.
  productShowcase: '/images/landing/teacher/Teacher_Center_Computer_Elements.png',
} as const;

/**
 * Teacher (Teacher OS) landing — the SAME storytelling shell as the student page
 * (fixed world + morphing logo + sticky hero lifecycle + window-scroll), with a
 * teacher-specific visual hierarchy:
 *   - Foundation (bg + desk): the persistent world.
 *   - Product Showcase (LandingShowcase): the laptop/dashboard anchors the right
 *     through Brand+Promise and fades only AFTER the hero→content handoff.
 *   - Decorative (left group): atmosphere that dissolves during the Product beat.
 *   - Hero copy: left-of-centre (align="start") so the showcase anchors the right.
 * The product-messaging content sections re-home (unchanged styling) into the
 * transparent `.lb-flow` over the fixed world.
 */
export function TeachersLandingRoute() {
  const navigate = useNavigate();
  const content = teachersLandingContent;
  const { hero } = content;

  return (
    <div className="landing-theme landing-redesign" dir="rtl" lang="he">
      <LandingFoundation bg={TEACHER_ASSETS.bg} desk={TEACHER_ASSETS.desk} />
      <LandingShowcase src={TEACHER_ASSETS.productShowcase} />

      <FloatingTopNavbar
        variant="landing"
        tabs={[]}
        actions={
          <>
            <GhostButton onClick={() => navigate('/login')}>כניסה למערכת (Sign In)</GhostButton>
            <SecondaryButton onClick={() => navigate('/')}>לתלמידים (For Students)</SecondaryButton>
          </>
        }
      />

      <DynamicHeroLogo />

      <LandingStage
        headline="הופכים את ההוראה הפרטית לקריירה"
        headlineAccent="מנוהלת."
        subtitle={hero.body}
        ctaLabel={hero.primaryCta.label}
        ctaTo={hero.primaryCta.to}
        align="start"
        decorations={[
          { src: TEACHER_ASSETS.decorationLeft, side: 'left' },
          { src: TEACHER_ASSETS.decorationRight, side: 'right' },
        ]}
      />

      {/* Product-messaging content — scrolls over the fixed world (styling unchanged). */}
      <div className="lb-flow">
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
    </div>
  );
}
