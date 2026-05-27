import type { Session } from '@supabase/supabase-js';

import { getSupabaseBrowserClient } from './supabaseClient';

const SESSION_EXPIRY_SKEW_SECONDS = 60;

export class ReauthRequiredError extends Error {
  constructor(message = 'Supabase session is not valid') {
    super(message);
    this.name = 'ReauthRequiredError';
  }
}

function isExpiredOrNearlyExpired(session: Session): boolean {
  if (!session.expires_at) return false;
  return session.expires_at <= Math.floor(Date.now() / 1000) + SESSION_EXPIRY_SKEW_SECONDS;
}

export async function ensureActiveSupabaseSession(): Promise<Session> {
  const supabase = getSupabaseBrowserClient();
  const sessionResult = await supabase.auth.getSession();
  let session = sessionResult.data.session;

  if (sessionResult.error || !session?.access_token) {
    throw new ReauthRequiredError('Missing Supabase session before Google Calendar linking');
  }

  if (isExpiredOrNearlyExpired(session)) {
    const refreshResult = await supabase.auth.refreshSession(session);

    if (refreshResult.error || !refreshResult.data.session?.access_token) {
      throw new ReauthRequiredError('Unable to refresh Supabase session before Google Calendar linking');
    }

    session = refreshResult.data.session;
  }

  let userResult = await supabase.auth.getUser();

  if (userResult.error || !userResult.data.user) {
    const refreshResult = await supabase.auth.refreshSession(session);

    if (refreshResult.error || !refreshResult.data.session?.access_token) {
      throw new ReauthRequiredError('Unable to recover Supabase session before Google Calendar linking');
    }

    session = refreshResult.data.session;
    userResult = await supabase.auth.getUser();

    if (userResult.error || !userResult.data.user) {
      throw new ReauthRequiredError('Supabase user verification failed before Google Calendar linking');
    }
  }

  return session;
}
