import { useNavigate } from 'react-router-dom';

import { FloatingTopNavbar, GhostButton, SecondaryButton } from '../../design-system';
import { LandingFoundation } from '../../components/landing/LandingFoundation';
import { DynamicHeroLogo } from '../../components/landing/DynamicHeroLogo';
import { LandingStage } from '../../components/landing/LandingStage';
import { LandingSections } from '../../components/landing/LandingSections';
import { mainLandingContent } from '../../content/landing/mainLandingContent';

// Student decorative element groups (atmosphere; dissolve during the Product beat).
const STUDENT_DECORATIONS = [
  { src: '/images/landing/student/Student_Left_Elements.svg', side: 'left' as const },
  { src: '/images/landing/student/Student_Right_Elements.svg', side: 'right' as const },
];

/**
 * Student (main) landing — redesigned cinematic stage. `.landing-theme` scopes the
 * landing semantic tokens. The canonical FloatingTopNavbar (variant="landing")
 * carries pre-auth actions on the left; the morphing DynamicHeroLogo owns the
 * top-right slot. The hero stage and bento sections re-home the existing copy.
 */
export function MainLandingRoute() {
  const navigate = useNavigate();
  const { hero } = mainLandingContent;

  return (
    <div className="landing-theme landing-redesign" dir="rtl" lang="he">
      <LandingFoundation />
      <FloatingTopNavbar
        variant="landing"
        tabs={[]}
        actions={
          <>
            <GhostButton onClick={() => navigate('/login')}>כניסה למערכת (Sign In)</GhostButton>
            <SecondaryButton onClick={() => navigate('/teachers')}>
              התחברות ל-Teacher OS (Teacher OS)
            </SecondaryButton>
          </>
        }
      />
      <DynamicHeroLogo />
      <LandingStage
        headline="המורה המדויק."
        headlineAccent="בלי ניחושים."
        subtitle={hero.subtitle}
        context={hero.context}
        ctaLabel="מתחילים התאמה (Start Matching)"
        ctaTo={hero.unifiedCta.to}
        align="center"
        decorations={STUDENT_DECORATIONS}
      />
      <LandingSections />
    </div>
  );
}
