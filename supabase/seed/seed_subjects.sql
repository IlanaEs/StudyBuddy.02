-- StudyBuddy.02 — Subject seed data
-- Run against any local or staging environment to populate the subjects table.
-- Idempotent: ON CONFLICT (name) DO NOTHING.
--
-- Names match exactly what the frontend sends in onboarding_draft.selectedSubjects
-- (see apps/frontend/src/content/teacherOnboardingContent.ts → SUBJECTS_BY_LEVEL).
-- Do NOT translate to English — the teacher repository does an exact name lookup.

insert into public.subjects (name, category, is_active) values
  -- STEM
  ('מתמטיקה',               'STEM',            true),
  ('מדעים',                 'STEM',            true),
  ('פיזיקה',                'STEM',            true),
  ('כימיה',                 'STEM',            true),
  ('ביולוגיה',              'STEM',            true),
  ('מחשבים',                'STEM',            true),
  ('מדעי המחשב',            'STEM',            true),
  ('סטטיסטיקה',             'STEM',            true),
  ('אלגברה לינארית',        'STEM',            true),
  ('חשבון אינפינטסימלי',   'STEM',            true),
  ('הסתברות',               'STEM',            true),
  -- Languages & Literature
  ('עברית',                 'Languages',       true),
  ('אנגלית',                'Languages',       true),
  ('ספרות',                 'Languages',       true),
  -- Humanities
  ('תנ"ך',                  'Humanities',      true),
  ('גיאוגרפיה',             'Humanities',      true),
  ('חינוך',                 'Humanities',      true),
  ('היסטוריה',              'Humanities',      true),
  ('אזרחות',                'Humanities',      true),
  -- Social Sciences
  ('כלכלה',                 'Social Sciences', true),
  ('פסיכולוגיה',            'Social Sciences', true),
  ('סוציולוגיה',            'Social Sciences', true),
  ('חשבונאות',              'Social Sciences', true),
  -- Arts
  ('אמנות',                 'Arts',            true),
  ('מוזיקה',                'Arts',            true)
on conflict (name) do nothing;
