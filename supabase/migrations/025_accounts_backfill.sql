-- StudyBuddy.02 DB Schema
-- 025_accounts_backfill.sql
-- Phase 0 backfill: give every existing identity exactly one DEFAULT account whose
-- role mirrors the legacy users.role, so requests with no active-account header
-- resolve to the same behavior as today. Idempotent: only inserts an account where
-- one does not yet exist for that (user_id, role). onboarding_completed is derived
-- per role so existing onboarded users are not forced back through onboarding:
--   teacher → onboarding_drafts.onboarding_completed (else false)
--   student → a self-owned students row exists
--   parent  → a parent-managed students row exists
--   admin   → true (admins do not onboard)

insert into public.accounts (user_id, role, is_default, onboarding_completed)
select
  u.id,
  u.role,
  true,
  case u.role
    when 'teacher' then coalesce(
      (select od.onboarding_completed from public.onboarding_drafts od where od.user_id = u.id),
      false)
    when 'student' then exists (select 1 from public.students s where s.user_id = u.id)
    when 'parent' then exists (select 1 from public.students s where s.parent_user_id = u.id)
    else true
  end
from public.users u
where not exists (
  select 1 from public.accounts a where a.user_id = u.id and a.role = u.role
);
