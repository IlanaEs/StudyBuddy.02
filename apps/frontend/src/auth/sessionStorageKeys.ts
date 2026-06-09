export const APP_LOCAL_STORAGE_KEYS = [
  'sb_teacher_guest_draft',
  'sb_student_gcal_return',
  'sb_student_onboarding',
  'sb_student_onboarding_oauth_pending',
] as const;

export const GCAL_PROVIDER_TOKEN_KEY = 'sb_gcal_provider_token';
export const ADMIN_QA_ROLE_KEY = 'sb_admin_qa_role_override';

export const APP_SESSION_STORAGE_KEYS = [
  'sb_gcal_connecting',
  'sb_gcal_return_step',
  'sb_gcal_return_route',
  GCAL_PROVIDER_TOKEN_KEY,
  'sb_provider_token',
  ADMIN_QA_ROLE_KEY,
] as const;

export function clearAppSessionStorage() {
  for (const key of APP_LOCAL_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage may be unavailable in private or restricted browser contexts.
    }
  }

  for (const key of APP_SESSION_STORAGE_KEYS) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Storage may be unavailable in private or restricted browser contexts.
    }
  }
}

/** Supabase persists its session under the default storageKey `sb-<ref>-auth-token`
 *  (older clients used `supabase.auth.token`). Match those so a reset can drop the
 *  Supabase session too — without touching unrelated keys. */
function isSupabaseAuthKey(key: string): boolean {
  return (key.startsWith('sb-') && key.includes('auth-token')) || key.startsWith('supabase.auth.');
}

function removeMatchingKeys(storage: Storage, predicate: (key: string) => boolean) {
  try {
    const matches: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && predicate(key)) matches.push(key);
    }
    // Collect first, then remove — removing while iterating shifts indices.
    for (const key of matches) storage.removeItem(key);
  } catch {
    // Storage may be unavailable in private or restricted browser contexts.
  }
}

/** Targeted auth reset: clears OUR app keys plus Supabase's own session keys,
 *  WITHOUT wiping unrelated localStorage (analytics, flags, other apps on the same
 *  origin). Replaces the previous nuclear localStorage.clear()/sessionStorage.clear(). */
export function resetBrowserAuthStorage() {
  clearAppSessionStorage();
  removeMatchingKeys(localStorage, isSupabaseAuthKey);
  removeMatchingKeys(sessionStorage, isSupabaseAuthKey);
}
