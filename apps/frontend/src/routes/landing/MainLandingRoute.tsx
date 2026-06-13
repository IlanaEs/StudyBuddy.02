import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { FloatingTopNavbar, GhostButton, SecondaryButton } from '../../design-system';
import { LandingAuthActions } from '../../components/landing/LandingAuthActions';
import { LandingFoundation } from '../../components/landing/LandingFoundation';
import { DynamicHeroLogo } from '../../components/landing/DynamicHeroLogo';
import { LandingStage } from '../../components/landing/LandingStage';
import { LandingSections } from '../../components/landing/LandingSections';
import { mainLandingContent } from '../../content/landing/mainLandingContent';
import { useAuth } from '../../auth/AuthProvider';
import { getPendingOnboardingResumePath } from '../../auth/onboardingResume';

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
  const auth = useAuth();
  const { hero } = mainLandingContent;

  // Safety net for a misrouted onboarding OAuth return. When Supabase can't honor
  // the wizard's redirectTo (its path isn't in the Auth "Redirect URLs" allowlist)
  // it falls back to the Site URL ('/') — the token hash lands here, AuthProvider
  // creates the session, but the wizard never mounts to finish provisioning, so
  // the user is stranded on the landing page (and only a second attempt works).
  // If an onboarding OAuth is pending and a session now exists, resume the wizard.
  useEffect(() => {
    if (auth.status === 'loading' || !auth.session) return;
    const resumePath = getPendingOnboardingResumePath();
    if (resumePath) navigate(resumePath, { replace: true });
  }, [auth.status, auth.session, navigate]);

  return (
    <div className="landing-theme landing-redesign" dir="rtl" lang="he">
      <LandingFoundation />
      <FloatingTopNavbar
        variant="landing"
        tabs={[]}
        actions={
          <LandingAuthActions
            loggedOut={
              <>
                <GhostButton onClick={() => navigate('/login')}>כניסה למערכת (Sign In)</GhostButton>
                <SecondaryButton onClick={() => navigate('/teachers')}>
                  התחברות ל-Teacher OS (Teacher OS)
                </SecondaryButton>
              </>
            }
          />
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
