-- StudyBuddy.02 DB Schema
-- 024_accounts.sql
-- Phase 0 of multi-account support: one Google login (one users / auth.users
-- identity) may own MULTIPLE separate app accounts (teacher / student / parent),
-- each with its OWN role, onboarding completion, and lifecycle. This table is
-- ADDITIVE and DORMANT in Phase 0 — no application code reads it yet. `users`
-- remains the identity row (still 1:1 with auth.users); `accounts` hangs many
-- accounts off one identity. The 025 backfill gives every existing user exactly
-- one default account, so behavior is unchanged until the backend opts in (Phase 1).
-- Idempotent (re-runnable): if-not-exists guards + drop-then-create for policy/trigger.

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.user_role not null,
  onboarding_completed boolean not null default false,
  status public.user_status not null default 'active',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_user_id_fk foreign key (user_id) references public.users(id) on delete cascade
);

comment on table public.accounts is 'Separate app account per (identity, role). One users row may own many accounts; selected per-request via the active-account header (Phase 1+).';

-- At most one account per (identity, role): a user may hold a teacher, a student,
-- and a parent account, but never two of the same role.
create unique index if not exists accounts_user_id_role_unique
  on public.accounts (user_id, role);

-- Exactly one default account per identity (the legacy/primary account used when
-- no active account is selected — preserves single-account behavior).
create unique index if not exists accounts_user_id_default_unique
  on public.accounts (user_id)
  where is_default;

create index if not exists accounts_user_id_idx on public.accounts(user_id);

alter table public.accounts enable row level security;

-- Self-scoped read only (defense-in-depth; the backend uses the service-role
-- client, which bypasses RLS). Account mutation is backend-only, so there is no
-- insert/update policy. Account-aware policy hardening for other tables is Phase 4.
drop policy if exists accounts_select_own on public.accounts;
create policy accounts_select_own
on public.accounts
for select
to authenticated
using (user_id = auth.uid());

drop trigger if exists set_accounts_updated_at on public.accounts;
create trigger set_accounts_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();
