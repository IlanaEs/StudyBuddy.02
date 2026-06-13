// eslint-disable-next-line import/extensions -- root-level taxonomy origin (.mjs + sibling .d.mts)
import { canonicalSubjectsByBand } from '../../../../scripts/taxonomy-data.mjs';

export const SB_ORANGE = '#f97316';
export const SB_ORANGE_SOFT = 'rgba(249,115,22,0.15)';
/** Cyber-professional neon accent (spec: #00f6ff) — used on progress bars and active borders. */
export const SB_NEON = '#00f6ff';

export const PROFESSIONAL_STATUS_OPTIONS = [
  { value: 'student_instructor', label: 'סטודנט/ית' },
  { value: 'certified_teacher', label: 'מורה מוסמך/ת' },
  { value: 'industry_professional', label: 'ניסיון מהתעשייה' },
  { value: 'academic_assistant', label: 'מתרגל/ת באקדמיה' },
  { value: 'excellent_courses', label: 'הצטיינות בקורסים' },
] as const;

export type ProfessionalStatus = (typeof PROFESSIONAL_STATUS_OPTIONS)[number]['value'];

export const ACADEMIC_YEAR_OPTIONS = ['שנה א', 'שנה ב', 'שנה ג', 'שנה ד', 'מוסמך', 'דוקטורט'];

export const TEACHING_LEVELS = [
  { value: 'elementary', label: 'יסודי' },
  { value: 'middle', label: 'חטיבה' },
  { value: 'high', label: 'תיכון' },
  { value: 'academic', label: 'אקדמיה' },
] as const;

export type TeachingLevel = (typeof TEACHING_LEVELS)[number]['value'];

// TEMPORARY (lecturer demo): the teacher subjects/levels picker offers school
// levels only — the Academic teaching path is hidden until course mapping is
// finished. Restore the full path by using TEACHING_LEVELS in Screen3 again.
// NOTE: this is the teaching LEVEL only; a teacher's professional status
// (student/academic-assistant, Screen 2) is unaffected.
export const SCHOOL_TEACHING_LEVELS = TEACHING_LEVELS.filter((l) => l.value !== 'academic');

// Subjects offered per teaching level. NOT defined here — a thin re-export of the
// canonical band→subjects map (scripts/taxonomy-data.mjs), the single origin
// shared with the student wizard (matching/data/subjectsByLevel.ts) so a teacher
// and a student at the same band always see the identical set. Edit the catalog
// there. The taxonomy sync guard (apps/backend/tests/taxonomySync.test.ts) fails
// CI if this diverges or offers a subject no demo teacher carries.
// Keyed by band only (no `academic`); the teaching-level picker uses
// SCHOOL_TEACHING_LEVELS, and consumers index with `?? []`.
export const SUBJECTS_BY_LEVEL: Record<string, string[]> = canonicalSubjectsByBand;

export const TEACHING_STYLES = [
  { value: 'very_patient', label: 'סבלני/ת מאוד' },
  { value: 'eye_level', label: 'מסביר/ה בגובה העיניים' },
  { value: 'exam_focused', label: 'ממוקד/ת מבחנים' },
  { value: 'fast_pace', label: 'קצב מהיר' },
  { value: 'deep_thorough', label: 'יסודי ומעמיק' },
  { value: 'lots_of_practice', label: 'הרבה תרגול' },
  { value: 'exam_marathons', label: 'מרתונים לפני מבחנים' },
  { value: 'adhd_experience', label: 'ניסיון עם ADHD' },
];

export const WEEKLY_AVAILABILITY_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];

export const MAX_STUDENTS_OPTIONS = [1, 3, 5, 10, 15, 20];
export const WEEKLY_HOURS_OPTIONS = [2, 4, 6, 8, 10, 15, 20];
export const SLA_HOURS_OPTIONS = [1, 2, 4, 8, 12, 24];

export const COMMITMENT_TYPES = [
  { value: 'long_term', label: 'ליווי ארוך טווח' },
  { value: 'single_session', label: 'שיעורים חד-פעמיים' },
  { value: 'exam_marathons', label: 'מרתוני מבחנים' },
  { value: 'flexible', label: 'גמיש לכל סוג' },
];

export const MARATHON_SESSION_OPTIONS = [1, 2, 3, 4, 5, 6];

export const EMERGENCY_AVAILABILITY_OPTIONS = [
  { value: 'always', label: 'כן, תמיד' },
  { value: 'sometimes', label: 'לפעמים' },
  { value: 'never', label: 'לא' },
];

export const INTRO_PRICING_OPTIONS = [
  { value: 'half_price', label: 'חצי מחיר' },
  { value: 'twenty_percent', label: '20% הנחה' },
  { value: 'full_price', label: 'מחיר רגיל' },
];

export const LOADING_MESSAGES = [
  'מייצרים את פרופיל ההוראה שלך...',
  'מסנכרנים את מנגנון הזמינות...',
  'מחברים את מנוע ההתאמות...',
  'מפעילים את סביבת העבודה שלך...',
];

export const STEP_PROGRESS: Record<number, number> = {
  1: 15,
  2: 35,
  3: 55,
  4: 70,
  5: 85,
  6: 100,
};

export const STEP_LABELS: Record<number, string> = {
  1: 'זהות מקצועית',
  2: 'רקע ונסיון',
  3: 'מקצועות וסגנון',
  4: 'מנוע ההוראה',
  5: 'תמחור וחוקיות',
  6: 'תצוגה מקדימה',
};

export const ACADEMIC_PATH_STATUSES: ProfessionalStatus[] = [
  'student_instructor',
  'certified_teacher',
  'academic_assistant',
  'excellent_courses',
];

// ── v2 redesign: 8-screen progress (1 = Account Connection … 8 = Preview) ──────
// Loading/Success are states 9/10 and not counted in the "Step X of 8" tracker.
export const STEP_PROGRESS_V2: Record<number, number> = {
  1: 8,
  2: 22,
  3: 38,
  4: 52,
  5: 66,
  6: 80,
  7: 92,
  8: 100,
};

export const TOTAL_SCREENS_V2 = 8;
