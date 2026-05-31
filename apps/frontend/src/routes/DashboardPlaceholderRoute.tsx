import { Link, Navigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import { isEligibleForAdminQa } from '../adminQa/adminQaMode';

// /dashboard is a catch-all for authenticated users.
// Teachers are routed to their role-specific dashboard; other roles get a generic shell.
export function DashboardPlaceholderRoute() {
  const auth = useAuth();

  // Authenticated parents (real or QA override) always go to the parent dashboard.
  if (auth.status === 'authenticated' && auth.effectiveRole === 'parent') {
    return <Navigate replace to="/parent/dashboard" />;
  }

  // Profile is resolved from /api/auth/me after login. Wait for it before
  // deciding on routing — avoids a flicker to the wrong screen.
  // Wait for profile to resolve before routing — avoids a flash to the wrong screen.
  if (auth.status === 'authenticated' && auth.user?.role === 'teacher' && auth.profile === null) {
    return <div className="text-white/72">Loading…</div>;
  }

  // Incomplete teachers → onboarding wizard.
  if (
    auth.status === 'authenticated' &&
    auth.user?.role === 'teacher' &&
    auth.profile?.onboardingCompleted === false
  ) {
    return <Navigate replace to="/teacher-onboarding" />;
  }

  const showQaControls = isEligibleForAdminQa(auth.user?.email, auth.user?.role);
  // Completed teachers → real teacher dashboard (keeps old /dashboard links working).
  if (
    auth.status === 'authenticated' &&
    auth.user?.role === 'teacher' &&
    auth.profile?.onboardingCompleted === true
  ) {
    return <Navigate replace to="/teacher/dashboard" />;
  }

  return (
    <div className="w-full max-w-2xl">
      <p className="mb-4 text-sm uppercase text-studybuddy-lime">Protected foundation</p>
      <h1 className="font-display text-4xl font-semibold leading-tight md:text-5xl">
        Authenticated workspace shell
      </h1>
      <div className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-5 shadow-soft">
        <p className="text-sm text-white/64">Verified local user</p>
        <p className="mt-2 text-lg font-semibold">{auth.user?.full_name}</p>
        <p className="mt-1 text-sm text-white/64">{auth.user?.email}</p>
        <p className="mt-4 inline-flex rounded-full border border-studybuddy-turquoise/30 px-3 py-1 text-xs text-studybuddy-turquoise">
          {auth.user?.role}
        </p>
      </div>

      {showQaControls && (
        <div className="mt-6 rounded-3xl border border-amber-400/30 bg-amber-400/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Admin QA Mode</p>
          <p className="mt-1 text-sm text-white/64">Test app flows as a different role. Does not change the database.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => auth.setQaRole('teacher')}
              className={[
                'inline-flex items-center rounded-xl border px-4 py-2 text-sm font-semibold transition-colors',
                auth.qaRole === 'teacher'
                  ? 'border-amber-400/60 bg-amber-400/20 text-amber-300'
                  : 'border-white/10 bg-white/5 text-white/80 hover:border-amber-400/40 hover:bg-amber-400/10',
              ].join(' ')}
            >
              Test as Teacher
            </button>
            <button
              type="button"
              onClick={() => auth.setQaRole('parent')}
              className={[
                'inline-flex items-center rounded-xl border px-4 py-2 text-sm font-semibold transition-colors',
                auth.qaRole === 'parent'
                  ? 'border-amber-400/60 bg-amber-400/20 text-amber-300'
                  : 'border-white/10 bg-white/5 text-white/80 hover:border-amber-400/40 hover:bg-amber-400/10',
              ].join(' ')}
            >
              Test as Parent
            </button>
            {auth.qaRole && (
              <button
                type="button"
                onClick={() => auth.setQaRole(null)}
                className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/60 transition-colors hover:border-white/20 hover:bg-white/10"
              >
                Clear QA Role
              </button>
            )}
          </div>
          {auth.qaRole === 'teacher' && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to="/teacher/inbox"
                className="inline-flex items-center rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-400/10"
              >
                → Teacher Inbox
              </Link>
              <Link
                to="/teacher/lessons"
                className="inline-flex items-center rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-400/10"
              >
                → Teacher Lessons
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
