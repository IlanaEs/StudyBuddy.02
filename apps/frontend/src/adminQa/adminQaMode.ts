import type { UserRole } from '../auth/authTypes';

export const ADMIN_QA_ROLE_KEY = 'sb_admin_qa_role_override';

export type QaRole = 'teacher' | 'parent';

const ADMIN_QA_ENABLED = import.meta.env.VITE_ENABLE_ADMIN_QA_MODE === 'true';
const ADMIN_QA_EMAILS = new Set(['i26082001@gmail.com']);

export function isAdminQaModeEnabled(): boolean {
  return ADMIN_QA_ENABLED;
}

export function isEligibleForAdminQa(email: string | null | undefined, role: UserRole | null | undefined): boolean {
  if (!isAdminQaModeEnabled()) return false;
  return role === 'admin' || (!!email && ADMIN_QA_EMAILS.has(email));
}

export function getQaRoleOverride(): QaRole | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_QA_ROLE_KEY);
    if (raw === 'teacher' || raw === 'parent') return raw;
  } catch {
    /* sessionStorage may be unavailable */
  }
  return null;
}

export function setQaRoleOverride(role: QaRole): void {
  try {
    sessionStorage.setItem(ADMIN_QA_ROLE_KEY, role);
  } catch {
    /* sessionStorage may be unavailable */
  }
}

export function clearQaRoleOverride(): void {
  try {
    sessionStorage.removeItem(ADMIN_QA_ROLE_KEY);
  } catch {
    /* sessionStorage may be unavailable */
  }
}

// ---------------------------------------------------------------------------
// Authorized QA header store
// Only AuthProvider writes here, and only after confirming user eligibility.
// client.ts reads this to inject X-Admin-QA-Role without needing auth context.
// ---------------------------------------------------------------------------

let _authorizedQaRole: QaRole | null = null;

/** Called by AuthProvider after confirming the user is eligible. */
export function authorizeQaHeader(role: QaRole | null): void {
  _authorizedQaRole = role;
}

/** Returns the X-Admin-QA-Role header if one has been authorized, else {}. */
export function getAuthorizedQaHeader(): Record<string, string> {
  if (_authorizedQaRole) {
    return { 'X-Admin-QA-Role': _authorizedQaRole };
  }
  return {};
}
