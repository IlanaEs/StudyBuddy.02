// Canonical subject taxonomy — the single source of truth for the `subjects` table.
//
// Side-effect-free on purpose: this module has NO imports so it can be loaded by
// the taxonomy sync-guard test (apps/backend/tests/taxonomySync.test.ts) without
// pulling in the Supabase client or reading env files. The seed script
// (scripts/seed-taxonomy.mjs) re-exports `canonicalSubjects` from here.
//
// MUST stay a superset of BOTH frontend subject catalogs, or subject resolution
// fails:
//   - apps/frontend/src/features/matching/data/subjectsByLevel.ts (student wizard;
//     resolved via case-insensitive `ilike` → loud 422 on miss)
//   - apps/frontend/src/content/teacherOnboardingContent.ts SUBJECTS_BY_LEVEL
//     (teacher onboarding; resolved via exact `.in('name', ...)` → silently drops
//     unmatched subjects)
// The sync guard enforces this on every CI run.
export const canonicalSubjects = [
  // School core / mathematics
  { name: 'מתמטיקה', category: 'school_core' },
  { name: 'חשבון', category: 'school_core' },
  { name: 'גאומטריה', category: 'school_core' },
  { name: 'חדו״א', category: 'school_core' },
  { name: 'לינארית', category: 'school_core' },
  { name: 'הסתברות', category: 'school_core' },
  { name: 'סטטיסטיקה', category: 'school_core' },
  { name: 'חקר ביצועים', category: 'school_core' },
  { name: 'הכנה לכיתה א׳', category: 'school_core' },
  { name: 'עזרה בשיעורי בית', category: 'school_core' },
  // Languages
  { name: 'אנגלית', category: 'languages' },
  { name: 'עברית', category: 'languages' },
  { name: 'קריאה וכתיבה', category: 'languages' },
  { name: 'הבנת הנקרא', category: 'languages' },
  // Humanities & social sciences
  { name: 'לשון', category: 'humanities' },
  { name: 'היסטוריה', category: 'humanities' },
  { name: 'ספרות', category: 'humanities' },
  { name: 'תנ״ך', category: 'humanities' },
  { name: 'גיאוגרפיה', category: 'humanities' },
  { name: 'אזרחות', category: 'humanities' },
  { name: 'פסיכולוגיה', category: 'humanities' },
  { name: 'כלכלה', category: 'humanities' },
  { name: 'תקשורת', category: 'humanities' },
  { name: 'חינוך', category: 'humanities' },
  { name: 'סוציולוגיה', category: 'humanities' },
  { name: 'חשבונאות', category: 'humanities' },
  // Sciences
  { name: 'פיזיקה', category: 'science' },
  { name: 'כימיה', category: 'science' },
  { name: 'ביולוגיה', category: 'science' },
  { name: 'מדעים', category: 'science' },
  { name: 'מעגלים', category: 'science' },
  // Arts
  { name: 'אמנות', category: 'arts' },
  { name: 'מוזיקה', category: 'arts' },
  // Technology / computer science
  { name: 'מדעי המחשב', category: 'technology' },
  { name: 'תכנות בסיסי', category: 'technology' },
  { name: 'רובוטיקה', category: 'technology' },
  { name: 'סייבר', category: 'technology' },
  { name: 'מבני נתונים', category: 'technology' },
  { name: 'אלגוריתמים', category: 'technology' },
  { name: 'OOP', category: 'technology' },
  { name: 'Java', category: 'technology' },
  { name: 'Python', category: 'technology' },
  { name: 'בסיסי נתונים', category: 'technology' },
  { name: 'מערכות הפעלה', category: 'technology' },
  { name: 'רשתות', category: 'technology' },
  { name: 'Full Stack', category: 'technology' },
  { name: 'React', category: 'technology' },
  { name: 'Node.js', category: 'technology' },
  { name: 'SQL', category: 'technology' },
  { name: 'Data Analysis', category: 'technology' },
];

// Canonical band → offered-subjects map — the SINGLE origin for which subjects
// each education level offers in BOTH wizards. The two frontend catalogs
// (teacher onboarding SUBJECTS_BY_LEVEL, student matching subjectsByLevel) are
// thin re-exports of this object, so a teacher and a student at the same band
// always see the identical set (matching joins on subject_id — divergent labels
// per band silently produce zero matches).
//
// Invariants, enforced by apps/backend/tests/taxonomySync.test.ts:
//   1. every name here exists in canonicalSubjects (above);
//   2. both frontend catalogs are band-for-band identical to this map;
//   3. every offered name is carried by >= 1 demo teacher
//      (scripts/demo-teachers-data.mjs) — the catalog must never offer a
//      subject no seeded teacher holds, or matching dead-ends.
//
// No `academic` band: the academic TEACHING level is intentionally hidden
// (teacher side), so academic is removed from the student/parent level
// selectors too — there is no academic offered-subjects set. The backend
// LEVEL_BANDS capability stays (dormant); see apps/backend/src/studentIntakes/levelBand.ts.
export const canonicalSubjectsByBand = {
  elementary: ['חשבון', 'אנגלית', 'עברית', 'קריאה וכתיבה', 'הבנת הנקרא', 'מדעים', 'הכנה לכיתה א׳'],
  middle: ['מתמטיקה', 'עברית', 'אנגלית', 'פיזיקה', 'כימיה', 'ביולוגיה', 'היסטוריה', 'אזרחות', 'מדעי המחשב', 'ספרות', 'לשון', 'מדעים', 'תנ״ך', 'גיאוגרפיה', 'תכנות בסיסי', 'רובוטיקה'],
  high: ['מתמטיקה', 'עברית', 'אנגלית', 'פיזיקה', 'כימיה', 'ביולוגיה', 'היסטוריה', 'אזרחות', 'מדעי המחשב', 'ספרות', 'גיאוגרפיה', 'לשון', 'תנ״ך', 'סייבר', 'פסיכולוגיה', 'כלכלה', 'תקשורת'],
};
