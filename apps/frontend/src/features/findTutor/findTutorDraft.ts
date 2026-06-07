import type { SoftCriteria } from '../../api/students';

// Persists the in-progress Find Tutor quick-wizard inputs across the Google
// Calendar OAuth redirect (which leaves and re-enters /find-tutor), so the search
// isn't lost. Search-only, ephemeral — cleared once restored.
const KEY = 'sb_find_tutor_draft';

export type FindTutorDraft = {
  subject: string;
  subjectIsCustom: boolean;
  goal: string | null;
  level: string | null;
  budgetMin: number;
  budgetMax: number;
  days: string[];
  times: string[];
  soft: SoftCriteria;
  step: number;
};

export function saveFindTutorDraft(draft: FindTutorDraft): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* ignore storage failures */
  }
}

export function loadFindTutorDraft(): FindTutorDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FindTutorDraft;
  } catch {
    return null;
  }
}

export function clearFindTutorDraft(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
