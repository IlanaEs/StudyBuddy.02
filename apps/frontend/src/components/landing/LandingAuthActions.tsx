import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider';
import { GhostButton } from '../../design-system';

/**
 * Landing navbar actions, auth-aware. When no one is signed in (or auth is still
 * resolving) it renders the page's normal pre-auth actions (`loggedOut`). When a
 * user IS authenticated — e.g. they were interrupted mid-onboarding but still have
 * a live session — it shows a "Logged in as …" indicator + a Logout button.
 *
 * Logout uses the shared AuthProvider.logout() (backend /logout + Supabase signOut
 * + local-state clear), then returns to the landing state. Used by both the student
 * and teacher landing pages so the behaviour is identical.
 */
export function LandingAuthActions({ loggedOut }: { loggedOut: ReactNode }) {
  const auth = useAuth();
  const navigate = useNavigate();

  // Only treat a fully-resolved authenticated session as logged in; 'loading' and
  // 'unauthenticated' both show the normal pre-auth actions.
  if (auth.status !== 'authenticated' || !auth.user) {
    return <>{loggedOut}</>;
  }

  const name = auth.user.full_name?.trim() || auth.user.email;

  async function handleLogout() {
    await auth.logout();
    navigate('/', { replace: true }); // back to the (now logged-out) landing
  }

  return (
    <>
      <span
        className="landing-auth-identity"
        title={auth.user.email}
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 6,
          maxWidth: 'min(46vw, 320px)',
          fontFamily: 'var(--sb-font-ui)',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary-muted)', whiteSpace: 'nowrap' }}>
          מחובר/ת כ (Logged in as)
        </span>
        <strong
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: 'var(--text-primary-inverse)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </strong>
      </span>
      <GhostButton onClick={() => void handleLogout()}>התנתקות (Logout)</GhostButton>
    </>
  );
}
