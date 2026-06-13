// Subjects offered in the matching wizard, grouped by education level.
//
// NOT defined here — a thin re-export of the canonical band→subjects map
// (scripts/taxonomy-data.mjs), the single origin shared with teacher onboarding
// (content/teacherOnboardingContent.ts) so a student and a teacher at the same
// band always see the identical set (matching joins on subject_id — divergent
// labels per band silently produce zero matches). Edit the catalog there.
// Every value resolves (case-insensitive `ilike`) to a row in the canonical
// `subjects` table, and is carried by >= 1 demo teacher; both invariants are
// enforced by apps/backend/tests/taxonomySync.test.ts.
//
// Unit-level granularity (e.g. "3/4/5 יח״ל") is intentionally NOT encoded in
// the subject name; it belongs in the intake `level` field. So "מתמטיקה 3 יח״ל"
// folds to the canonical subject "מתמטיקה".
//
// No `academic` band: the academic teaching level is hidden teacher-side, so it
// is removed from the student/parent level selectors too — no academic intake
// can be created, closing the academic zero-match dead-end at the source.
import { canonicalSubjectsByBand } from '../../../../../../scripts/taxonomy-data.mjs';

export const subjectsByLevel: Record<string, string[]> = canonicalSubjectsByBand;

export const gradesByLevel: Record<string, string[]> = {
  elementary: ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳'],
  middle: ['ז׳', 'ח׳', 'ט׳'],
  high: ['י׳', 'י״א', 'י״ב'],
};

/** The level bands, in order. Keys of subjectsByLevel / gradesByLevel. */
export type LevelBand = 'elementary' | 'middle' | 'high';

/**
 * Resolve an effective level value to its band. The value may already be a band
 * key ('middle'), or a specific grade ('ח׳' → 'middle', 'שנה ב׳' → 'academic').
 * Returns null when it can't be resolved (caller falls back to the full catalog).
 */
export function bandForLevel(level: string | null | undefined): LevelBand | null {
  if (!level) return null;
  if (level in subjectsByLevel) return level as LevelBand;
  for (const band of Object.keys(gradesByLevel) as LevelBand[]) {
    if (gradesByLevel[band]!.includes(level)) return band;
  }
  return null;
}

/** All catalog subjects (de-duped, sorted) — used when no band is resolved. */
export const ALL_SUBJECTS: string[] = [...new Set(Object.values(subjectsByLevel).flat())].sort();

/** Subjects offered for an effective level; full catalog when the band is unknown. */
export function subjectsForLevel(level: string | null | undefined): string[] {
  const band = bandForLevel(level);
  if (!band) return ALL_SUBJECTS;
  return [...new Set(subjectsByLevel[band]!)].sort();
}
