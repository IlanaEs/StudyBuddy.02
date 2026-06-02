import type { Session } from '@supabase/supabase-js';
import { LogIn, LogOut, RotateCcw, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from './AuthProvider';
import { clearAppSessionStorage, resetBrowserAuthStorage } from './sessionStorageKeys';
import { getSupabaseBrowserClient } from './supabaseClient';

function getSessionDisplayName(session: Session | null): string | null {
  const metadata = session?.user?.user_metadata as { full_name?: unknown; name?: unknown } | undefined;
  if (typeof metadata?.full_name === 'string' && metadata.full_name.trim()) return metadata.full_name;
  if (typeof metadata?.name === 'string' && metadata.name.trim()) return metadata.name;
  return session?.user?.email ?? null;
}

export function SessionControls() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [rawSession, setRawSession] = useState<Session | null>(auth.session);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) setRawSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setRawSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setRawSession(auth.session);
  }, [auth.session]);

  const hasSession = !!auth.session || !!rawSession;
  const displayName = auth.user?.full_name || getSessionDisplayName(rawSession);
  const email = auth.user?.email || rawSession?.user?.email || null;

  const sessionLabel = useMemo(() => {
    if (!hasSession) return null;
    return displayName && email && displayName !== email ? `${displayName} · ${email}` : displayName ?? email ?? 'משתמש מחובר';
  }, [displayName, email, hasSession]);

  async function handleLogout() {
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      if (auth.session) {
        await auth.logout();
      } else {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
        clearAppSessionStorage();
      }
    } finally {
      setRawSession(null);
      setIsSigningOut(false);
      navigate('/', { replace: true });
    }
  }

  function handleResetAuth() {
    resetBrowserAuthStorage();
    window.location.reload();
  }

  return (
    <aside className="session-controls" dir="rtl" aria-label="מצב התחברות">
      {hasSession ? (
        <>
          <span className="session-controls__identity">{sessionLabel}</span>
          <button className="session-controls__button" type="button" onClick={() => void handleLogout()} disabled={isSigningOut}>
            <LogOut size={14} />
            התנתקות (Sign Out)
          </button>
        </>
      ) : (
        <>
          <Link className="session-controls__button" to="/login">
            <LogIn size={14} />
            כניסה (Sign In)
          </Link>
          <Link className="session-controls__button" to="/onboarding/matching">
            <UserPlus size={14} />
            הרשמה (Sign Up)
          </Link>
        </>
      )}
      {import.meta.env.DEV && (
        <button className="session-controls__button session-controls__button--secondary" type="button" onClick={handleResetAuth}>
          <RotateCcw size={14} />
          איפוס התחברות (Reset)
        </button>
      )}
    </aside>
  );
}
