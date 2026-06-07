// Subjects offered in the matching wizard, grouped by education level.
//
// IMPORTANT: every value here MUST exist (case-insensitive) in the canonical
// `subjects` taxonomy, otherwise intake submission fails with 422
// ("לא נמצא מקצוע מתאים במערכת"). The backend resolves subject_name via an
// `ilike` match. The source of truth for the taxonomy is
// `scripts/taxonomy-data.mjs` (canonicalSubjects); the subset relationship is
// enforced by apps/backend/tests/taxonomySync.test.ts — keep the two in sync.
//
// Unit-level granularity (e.g. "3/4/5 יח״ל") is intentionally NOT encoded in
// the subject name; it belongs in the intake `level` field. So "מתמטיקה 3 יח״ל"
// folds to the canonical subject "מתמטיקה".
export const subjectsByLevel: Record<string, string[]> = {
  elementary: ['חשבון', 'עברית', 'אנגלית', 'מדעים', 'הכנה לכיתה א׳', 'קריאה וכתיבה', 'הבנת הנקרא'],
  middle: ['מתמטיקה', 'אנגלית', 'לשון', 'מדעים', 'היסטוריה', 'ספרות', 'תנ״ך', 'גיאוגרפיה', 'אזרחות', 'תכנות בסיסי', 'רובוטיקה', 'מדעי המחשב'],
  high: ['מתמטיקה', 'אנגלית', 'פיזיקה', 'כימיה', 'ביולוגיה', 'מדעי המחשב', 'לשון', 'ספרות', 'היסטוריה', 'תנ״ך', 'אזרחות', 'סייבר', 'פסיכולוגיה', 'כלכלה', 'תקשורת'],
  academic: ['מבני נתונים', 'אלגוריתמים', 'OOP', 'Java', 'Python', 'בסיסי נתונים', 'מערכות הפעלה', 'רשתות', 'Full Stack', 'React', 'Node.js', 'הסתברות', 'סטטיסטיקה', 'חקר ביצועים', 'SQL', 'Data Analysis', 'מעגלים', 'חדו״א', 'לינארית', 'פיזיקה'],
};

export const gradesByLevel: Record<string, string[]> = {
  elementary: ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳'],
  middle: ['ז׳', 'ח׳', 'ט׳'],
  high: ['י׳', 'י״א', 'י״ב'],
  academic: ['שנה א׳', 'שנה ב׳', 'שנה ג׳', 'שנה ד׳'],
};

/** The level bands, in order. Keys of subjectsByLevel / gradesByLevel. */
export type LevelBand = 'elementary' | 'middle' | 'high' | 'academic';

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
