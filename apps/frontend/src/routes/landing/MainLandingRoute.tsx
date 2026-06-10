import { useNavigate } from 'react-router-dom';

import { FloatingTopNavbar, GhostButton, SecondaryButton } from '../../design-system';
import { DynamicHeroLogo } from '../../components/landing/DynamicHeroLogo';
import { LandingStage } from '../../components/landing/LandingStage';
import { LandingSections } from '../../components/landing/LandingSections';

/**
 * Student (main) landing — redesigned cinematic stage. `.landing-theme` scopes the
 * landing semantic tokens. The canonical FloatingTopNavbar (variant="landing")
 * carries pre-auth actions on the left; the morphing DynamicHeroLogo owns the
 * top-right slot. The hero stage and bento sections re-home the existing copy.
 */
export function MainLandingRoute() {
  const navigate = useNavigate();

  return (
    <div className="landing-theme landing-redesign" dir="rtl" lang="he">
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
      <LandingStage />
      <LandingSections />
    </div>
  );
}
