-- 022_intake_manual_subject.sql
-- Off-taxonomy ("course not in catalog") Find Tutor searches: instead of blocking,
-- store the student's free-text course ON the intake, flagged for manual matching.
-- The intake then carries NO resolved subject_id (it is a manual-match lead, not a
-- bookable/automatically-matched intake). Idempotent.

-- A manual-match intake has no resolved subject.
alter table public.student_intakes
  alter column subject_id drop not null;

-- Free-text course typed by the student + the manual-match flag.
alter table public.student_intakes
  add column if not exists custom_subject_text varchar(200);
alter table public.student_intakes
  add column if not exists needs_manual_match boolean not null default false;

-- Every intake must EITHER resolve to a catalog subject OR be a flagged manual-match
-- lead carrying the free-text course. (status stays 'open' — no new enum value.)
alter table public.student_intakes
  drop constraint if exists student_intakes_subject_or_custom_check;
alter table public.student_intakes
  add constraint student_intakes_subject_or_custom_check
  check (subject_id is not null or (needs_manual_match = true and custom_subject_text is not null));
