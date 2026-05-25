-- Migration 011: calendar_connections table
-- Backend-owned Google Calendar OAuth connection state, one row per teacher user.
-- The backend exchanges the OAuth code itself (not Supabase linkIdentity) and is
-- the single source of truth for whether a calendar is connected.
--
-- The refresh token is stored encrypted (AES-256-GCM) so the backend can re-sync
-- busy slots later without forcing the teacher to reconnect. Because this row
-- holds a secret, RLS is enabled with NO policies: only the service role (which
-- bypasses RLS and is used by the backend) may read or write it. No anon or
-- authenticated client can reach it directly.

create table public.calendar_connections (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null,
  provider                text not null default 'google',
  connected               boolean not null default false,
  connected_at            timestamptz,
  -- AES-256-GCM ciphertext (iv.tag.data, base64). Never returned to the client.
  refresh_token_encrypted text,
  -- Cached busy intervals: [{ startAt, endAt, source }]
  busy_slots              jsonb not null default '[]'::jsonb,
  last_synced_at          timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint calendar_connections_user_id_fk
    foreign key (user_id) references public.users(id) on delete cascade,
  constraint calendar_connections_user_id_unique unique (user_id),
  constraint calendar_connections_provider_check
    check (provider in ('google'))
);

create index calendar_connections_user_id_idx on public.calendar_connections(user_id);

create trigger set_calendar_connections_updated_at
before update on public.calendar_connections
for each row execute function public.set_updated_at();

-- Lock the table down: RLS on, no policies → service-role-only access.
alter table public.calendar_connections enable row level security;
