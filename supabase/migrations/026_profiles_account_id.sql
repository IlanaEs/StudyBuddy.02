-- StudyBuddy.02 DB Schema
-- 026_profiles_account_id.sql
-- Phase 0: add a nullable account_id to the profile / onboarding tables and backfill
-- it 1:1 from each owner's default account. ADDITIVE — the existing user_id columns
-- and FKs are untouched. In Phase 1 the resolvers gain an account-scoped path that
-- filters by account_id while keeping the user_id fallback, so single-account
-- behavior is unchanged. Idempotent: add-column-if-not-exists + null-only backfill.

alter table public.teacher_profiles  add column if not exists account_id uuid references public.accounts(id);
alter table public.students          add column if not exists account_id uuid references public.accounts(id);
alter table public.onboarding_drafts add column if not exists account_id uuid references public.accounts(id);

create index if not exists teacher_profiles_account_id_idx  on public.teacher_profiles(account_id);
create index if not exists students_account_id_idx          on public.students(account_id);
create index if not exists onboarding_drafts_account_id_idx on public.onboarding_drafts(account_id);

-- teacher_profiles → owner's teacher account.
update public.teacher_profiles tp
set account_id = a.id
from public.accounts a
where tp.account_id is null
  and a.user_id = tp.user_id
  and a.role = 'teacher';

-- Independent students (user_id set) → that user's student account.
update public.students s
set account_id = a.id
from public.accounts a
where s.account_id is null
  and s.user_id is not null
  and a.user_id = s.user_id
  and a.role = 'student';

-- Parent-managed students (user_id null, parent_user_id set) → the parent's account.
update public.students s
set account_id = a.id
from public.accounts a
where s.account_id is null
  and s.user_id is null
  and s.parent_user_id is not null
  and a.user_id = s.parent_user_id
  and a.role = 'parent';

-- onboarding_drafts (teacher-only today) → owner's default account.
update public.onboarding_drafts od
set account_id = a.id
from public.accounts a
where od.account_id is null
  and a.user_id = od.user_id
  and a.is_default;
