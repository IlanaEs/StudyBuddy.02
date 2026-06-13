import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  STUDENT_OAUTH_PENDING_KEY,
  TEACHER_OAUTH_PENDING_KEY,
  getPendingOnboardingResumePath,
} from './onboardingResume';

// Guards the first-login OAuth safety net: when a Google onboarding redirect is
// misrouted to the Site URL ('/') instead of the wizard, the landing page uses
// this to resume the correct wizard so provisioning completes (otherwise the auth
// user is created but the app user never is, and only a 2nd attempt works).

// The node test env has no localStorage; provide an in-memory stub (the source
// itself guards access in try/catch, so production is unaffected either way).
beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getPendingOnboardingResumePath', () => {
  it('returns null when no onboarding OAuth is pending', () => {
    expect(getPendingOnboardingResumePath()).toBeNull();
  });

  it('resumes the matching wizard when the student flag is set', () => {
    localStorage.setItem(STUDENT_OAUTH_PENDING_KEY, 'true');
    expect(getPendingOnboardingResumePath()).toBe('/onboarding/matching');
  });

  it('resumes teacher onboarding when the teacher flag is set', () => {
    localStorage.setItem(TEACHER_OAUTH_PENDING_KEY, 'true');
    expect(getPendingOnboardingResumePath()).toBe('/teacher-onboarding');
  });

  it('prefers the student wizard when both flags are set', () => {
    localStorage.setItem(STUDENT_OAUTH_PENDING_KEY, 'true');
    localStorage.setItem(TEACHER_OAUTH_PENDING_KEY, 'true');
    expect(getPendingOnboardingResumePath()).toBe('/onboarding/matching');
  });
});
