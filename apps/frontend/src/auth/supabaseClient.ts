import { createClient } from '@supabase/supabase-js';

let browserClient: ReturnType<typeof createClient> | null = null;

// Module-level capture: provider_token is only present in the SIGNED_IN event
// emitted during the OAuth code exchange inside createClient() initialization.
// By the time AuthProvider mounts and subscribes to onAuthStateChange, that
// event has already fired (and provider_token is not persisted to localStorage).
// Subscribing here — at client-creation time — is the only reliable capture point.
let _earlyProviderToken: string | null = null;

export function consumeEarlyProviderToken(): string | null {
  const token = _earlyProviderToken;
  _earlyProviderToken = null;
  return token;
}

export function getSupabaseBrowserClient() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase frontend environment variables are not configured');
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });

    // Subscribe immediately — before any component mounts — so we catch the
    // SIGNED_IN event that fires during the OAuth code exchange.
    browserClient.auth.onAuthStateChange((_event, session) => {
      if (session?.provider_token) {
        _earlyProviderToken = session.provider_token;
      }
    });
  }

  return browserClient;
}
