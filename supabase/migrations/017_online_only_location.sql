-- StudyBuddy.02 DB Schema
-- 017_online_only_location.sql
-- Documents the product decision that student intakes are online-only.
-- The enum public.location_type ('online' | 'frontal' | 'both') is preserved
-- because teacher_profiles may still reference it, but new student intakes
-- are validated to 'online' by the backend.

comment on column public.student_intakes.location_preference is
  'Lesson location preference. Product is currently online-only; backend validates to online.';

-- Soft constraint: new intakes should be online. Existing frontal/both rows (if any) are preserved.
-- A CHECK would break existing rows, so we document via comment instead.
