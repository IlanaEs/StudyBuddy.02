// Staging DEMO mode — makes the stakeholder demo link "just work": the dashboard
// seed is auto-populated and a pre-issued teacher session is hydrated, so the bare
// staging URL opens straight into a populated dashboard with zero friction.
//
// HARD-GATED to the staging host: enabled ONLY when the build-time flag is set AND
// the page is served from the allowlisted staging hostname. Every other host (all
// production domains, any preview URL) fails the check, so this can never run in
// production. The flag is also absent from the production environment as the
// primary gate. Mirrors the existing adminQa/adminQaMode.ts pattern.
//
// All values come from staging-only env vars — nothing prod-specific is hardcoded.

const DEMO_ENABLED = import.meta.env.VITE_ENABLE_DEMO_SEED === 'true';
const STAGING_HOST = import.meta.env.VITE_DEMO_STAGING_HOST ?? '';
const DEMO_ACCESS_TOKEN = import.meta.env.VITE_DEMO_SESSION_AT ?? '';
const DEMO_REFRESH_TOKEN = import.meta.env.VITE_DEMO_SESSION_RT ?? '';

/**
 * True ONLY in a build with VITE_ENABLE_DEMO_SEED='true' AND served from the
 * allowlisted staging host (VITE_DEMO_STAGING_HOST). The single source of truth
 * for both the demo seed and the demo auto-login.
 */
export function isDemoStagingMode(): boolean {
  if (!DEMO_ENABLED || !STAGING_HOST) return false;
  try {
    return window.location.hostname === STAGING_HOST;
  } catch {
    return false;
  }
}

/**
 * The pre-issued demo-teacher session tokens (staging env only). Returns null
 * unless both tokens are present, so the auto-login no-ops without them.
 */
export function getDemoSessionTokens(): { access_token: string; refresh_token: string } | null {
  if (!DEMO_ACCESS_TOKEN || !DEMO_REFRESH_TOKEN) return null;
  return { access_token: DEMO_ACCESS_TOKEN, refresh_token: DEMO_REFRESH_TOKEN };
}
