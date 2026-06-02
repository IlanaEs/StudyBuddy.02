-- StudyBuddy.02 DB Schema
-- 016_google_only_auth.sql
-- Documents the Google-only auth decision at the DB layer.
-- Email+password signup/login has been removed from the application.
-- All new accounts are created via Google OAuth → POST /api/auth/complete-oauth-signup.

comment on table public.users is
  'Platform users. Auth is Google OAuth only (email+password disabled). Rows are created by completeOAuthSignup.';

alter table public.users
  add column if not exists auth_provider text not null default 'google';

comment on column public.users.auth_provider is
  'OAuth provider used to create the account. Currently always google.';
