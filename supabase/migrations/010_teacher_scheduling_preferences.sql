-- StudyBuddy.02 DB Schema
-- 008_teacher_scheduling_preferences.sql
-- Adds scheduling preference columns to teacher_profiles.
-- These fields drive the slot-generation algorithm (Task 3):
-- lesson duration, break between lessons, and alignment strategy.

alter table public.teacher_profiles
  add column default_lesson_duration_minutes integer not null default 50,
  add column default_break_duration_minutes integer not null default 10,
  add column slot_alignment text not null default 'window_start';

alter table public.teacher_profiles
  add constraint teacher_profiles_lesson_duration_check
    check (default_lesson_duration_minutes between 15 and 180),
  add constraint teacher_profiles_break_duration_check
    check (default_break_duration_minutes between 0 and 60),
  add constraint teacher_profiles_slot_alignment_check
    check (slot_alignment in ('window_start', 'round_hour'));
