import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';

export function AppShell({ children }: PropsWithChildren) {
  const auth = useAuth();

  return (
    <main className="min-h-dvh bg-studybuddy-teal text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <Link className="font-display text-xl font-semibold" to="/">
            StudyBuddy.02
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            {auth.status === 'authenticated' ? (
              <>
                <Link className="text-white/72 transition hover:text-white" to="/dashboard">
                  Workspace
                </Link>
                <button
                  className="rounded-full border border-studybuddy-turquoise/40 px-3 py-1 text-xs text-studybuddy-turquoise transition hover:bg-studybuddy-turquoise/10"
                  onClick={() => void auth.logout()}
                  type="button"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link className="text-white/72 transition hover:text-white" to="/login">
                  Sign in
                </Link>
                <Link
                  className="rounded-full border border-studybuddy-turquoise/40 px-3 py-1 text-xs text-studybuddy-turquoise transition hover:bg-studybuddy-turquoise/10"
                  to="/signup"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </header>
        <section className="flex flex-1 items-center py-12">{children}</section>
      </div>
    </main>
  );
}
