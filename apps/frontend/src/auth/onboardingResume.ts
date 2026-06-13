// Shared markers + resume logic for an in-progress onboarding Google OAuth.
//
// Each onboarding wizard sets its flag in localStorage right before the
// signInWithOAuth redirect, and consumes it when it resumes on return. The flag
// survives the full-page Google round-trip (localStorage is not cleared by the
// redirect), so it also tells the LANDING page when an OAuth return was misrouted
// to the Supabase Site URL ('/') instead of the wizard's redirectTo — letting us
// resume the correct wizard rather than stranding the user on the landing page.
//
// Root cause of that misroute is the Supabase Auth "Redirect URLs" allowlist not
// covering the wizard paths (GoTrue then falls back to the Site URL); this module
// is the client-side safety net so a single dropped hop can't lose the flow.

export const STUDENT_OAUTH_PENDING_KEY = 'sb_student_onboarding_oauth_pending';
export const TEACHER_OAUTH_PENDING_KEY = 'sb_teacher_onboarding_oauth_pending';

/**
 * The onboarding wizard path to resume if a Google OAuth onboarding is pending,
 * else null. Student takes precedence (only one onboarding runs at a time).
 */
export function getPendingOnboardingResumePath(): string | null {
  try {
    if (localStorage.getItem(STUDENT_OAUTH_PENDING_KEY)) return '/onboarding/matching';
    if (localStorage.getItem(TEACHER_OAUTH_PENDING_KEY)) return '/teacher-onboarding';
  } catch {
    /* storage unavailable (private mode) — nothing to resume */
  }
  return null;
}
