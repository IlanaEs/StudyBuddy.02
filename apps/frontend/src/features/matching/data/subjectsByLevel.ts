// Subjects offered in the matching wizard, grouped by education level.
//
// IMPORTANT: every value here MUST exist (case-insensitive, exact) in the
// canonical `subjects` taxonomy, otherwise intake submission fails with 422
// ("לא נמצא מקצוע מתאים במערכת"). The backend resolves subject_name via an
// exact ilike match. The source of truth for the taxonomy is
// `scripts/seed-taxonomy.mjs` (canonicalSubjects) — keep the two in sync.
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
