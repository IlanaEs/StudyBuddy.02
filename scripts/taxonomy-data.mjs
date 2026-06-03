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
  { name: 'חדו״א', category: 'school_core' },
  { name: 'לינארית', category: 'school_core' },
  { name: 'הסתברות', category: 'school_core' },
  { name: 'סטטיסטיקה', category: 'school_core' },
  { name: 'חקר ביצועים', category: 'school_core' },
  { name: 'הכנה לכיתה א׳', category: 'school_core' },
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
