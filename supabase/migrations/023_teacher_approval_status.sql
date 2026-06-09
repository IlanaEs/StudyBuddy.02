-- 023_teacher_approval_status.sql
-- Teacher APPROVAL gate (participation): completing onboarding no longer auto-
-- verifies a teacher. Completion now leaves is_verified=false and the profile
-- enters a 'pending' approval queue; an admin must Approve (sets is_verified=true,
-- the matching gate) or Reject. This is SEPARATE from certification (blue-check,
-- Track 2). varchar+CHECK, not a pg enum (no enum surface). Idempotent.

alter table public.teacher_profiles
  add column if not exists approval_status text not null default 'pending';

alter table public.teacher_profiles
  drop constraint if exists teacher_profiles_approval_status_check;
alter table public.teacher_profiles
  add constraint teacher_profiles_approval_status_check
  check (approval_status in ('pending', 'approved', 'rejected'));

-- Backfill: teachers already verified under the old auto-verify path keep working.
update public.teacher_profiles set approval_status = 'approved' where is_verified = true;
