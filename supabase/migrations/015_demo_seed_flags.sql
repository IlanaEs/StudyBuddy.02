-- StudyBuddy.02 DB Schema
-- 015_demo_seed_flags.sql
-- Adds explicit demo/seed flags so dev/staging data can be filtered from
-- production analytics, admin views, and matching surfaces when needed.

alter table public.users
  add column is_demo boolean not null default false;

alter table public.teacher_profiles
  add column is_demo boolean not null default false;

comment on column public.users.is_demo is
  'True only for deterministic dev/demo seed users. Production-created users must remain false.';

comment on column public.teacher_profiles.is_demo is
  'True only for deterministic dev/demo seed teacher profiles. Production-created profiles must remain false.';

create index users_is_demo_idx
  on public.users(is_demo);

create index teacher_profiles_is_demo_idx
  on public.teacher_profiles(is_demo);
