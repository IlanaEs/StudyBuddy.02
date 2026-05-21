-- Migration 010: onboarding_drafts table
-- Stores partial onboarding state per teacher user so OAuth redirects
-- (Google Calendar connect) do not destroy in-flight form progress.
-- Keyed on user_id (not teacher_profiles.id) so the draft can exist
-- before the teacher profile is formally created on completion.

create table public.onboarding_drafts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null,
  onboarding_step     integer not null default 1,
  onboarding_completed boolean not null default false,
  full_name           varchar(150),
  hourly_rate         numeric(10,2),
  professional_status text,
  legal_tax           boolean not null default false,
  legal_contractor    boolean not null default false,
  legal_minors        boolean not null default false,
  legal_community     boolean not null default false,
  -- All remaining form fields stored as a JSONB blob.
  -- Shape mirrors OnboardingDraftRemote on the frontend.
  draft_data          jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint onboarding_drafts_user_id_fk
    foreign key (user_id) references public.users(id) on delete cascade,
  constraint onboarding_drafts_user_id_unique unique (user_id),
  constraint onboarding_drafts_step_check
    check (onboarding_step between 1 and 10),
  constraint onboarding_drafts_hourly_rate_check
    check (hourly_rate is null or hourly_rate >= 0)
);

create index onboarding_drafts_user_id_idx on public.onboarding_drafts(user_id);

create trigger set_onboarding_drafts_updated_at
before update on public.onboarding_drafts
for each row execute function public.set_updated_at();
