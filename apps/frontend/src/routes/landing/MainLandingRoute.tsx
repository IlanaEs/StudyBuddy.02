import {
  AudienceListSection,
  BentoAudienceGrid,
  BrutalComparisonTable,
  FAQAccordion,
  ForkRoleCards,
  LandingCTA,
  LandingHero,
  LandingScreenNav,
  LegalFooter,
  ParentDashboardPreview,
  ProcessStepper,
  ValueSection,
} from '../../components/landing/LandingComponents';
import { mainLandingContent } from '../../content/landing/mainLandingContent';

export function MainLandingRoute() {
  const content = mainLandingContent;

  return (
    <div className="landing-page" dir="rtl" lang="he">
      <LandingHero
        brand={content.brand}
        title={content.hero.title}
        subtitle={content.hero.subtitle}
        context={content.hero.context}
        teacherCta={content.hero.teacherCta}
      >
        <ForkRoleCards roles={content.hero.roles} />
      </LandingHero>
      <LandingScreenNav
        items={[
          { label: 'למי StudyBuddy מתאימה?', href: '#audience' },
          { label: 'איך זה עובד?', href: '#process' },
          { label: 'למה StudyBuddy?', href: '#value' },
          { label: content.faq.title, href: '#faq' },
          { label: content.hero.teacherCta.label, href: content.hero.teacherCta.to, tone: 'primary' },
        ]}
      />
      <AudienceListSection
        id="audience"
        title={content.audience.title}
        subtitle={content.audience.subtitle}
        items={content.audience.items}
      />
      <ProcessStepper
        id="process"
        title={content.process.title}
        summary={content.process.summary}
        steps={content.process.steps}
        closing={content.process.closing}
      />
      <ValueSection id="value" title={content.value.title} hook={content.value.hook} items={content.value.items} />
      <BrutalComparisonTable
        title={content.comparison.title}
        columns={content.comparison.columns}
        rows={content.comparison.rows}
      />
      <ParentDashboardPreview
        title={content.parents.title}
        intro={content.parents.intro}
        items={content.parents.items}
      />
      <FAQAccordion title={content.quickFaq.title} items={content.quickFaq.items} />
      <FAQAccordion id="faq" title={content.faq.title} sections={content.faq.sections} />
      <LandingCTA
        title={content.finalCta.title}
        label={content.finalCta.label}
        to={content.finalCta.to}
      />
      <LegalFooter
        title={content.legal.title}
        items={content.legal.items}
        support={content.legal.support}
        supportLinks={content.legal.supportLinks}
      />
    </div>
  );
}
