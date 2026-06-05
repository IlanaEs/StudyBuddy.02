-- StudyBuddy.02 DB Schema
-- 020_find_tutor_quick_wizard.sql
-- Support for the condensed "Find Tutor" quick wizard:
--   1. Persist + pre-fill structured soft criteria on student intakes (matching
--      still ignores them — capture-only).
--   2. Allow off-taxonomy SUBJECT requests to reuse academic_repository_requests
--      (Sacred Naming — same "request to add a controlled-vocab item" concept).

alter table public.student_intakes
  add column if not exists soft_criteria jsonb;

comment on column public.student_intakes.soft_criteria is
  'Structured soft preferences from the quick wizard: { teacher_gender, fast_pace, adhd_experience, inclusive_approach }. Captured + pre-filled; not consumed by matching yet.';

-- Extend the controlled-vocab request type to include subject requests. The
-- admin approve→subjects upsert is deferred to the Admin/taxonomy backlog.
alter table public.academic_repository_requests
  drop constraint if exists academic_repository_requests_type_check;
alter table public.academic_repository_requests
  add constraint academic_repository_requests_type_check
  check (repository_type in ('institution', 'field', 'subject'));
