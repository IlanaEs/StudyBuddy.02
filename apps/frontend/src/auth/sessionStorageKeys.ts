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

export function resetBrowserAuthStorage() {
  try {
    localStorage.clear();
  } catch {
    // Storage may be unavailable in private or restricted browser contexts.
  }

  try {
    sessionStorage.clear();
  } catch {
    // Storage may be unavailable in private or restricted browser contexts.
  }
}
