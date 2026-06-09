-- StudyBuddy — Admin provisioning (MANUAL RUN ONLY)
-- =============================================================================
-- Promotes an EXISTING public.users row to the flat 'admin' role.
--
-- The admin console is the highest-privilege surface in the system. Admin is
-- provisioned by HAND — there is NO code path, endpoint, or self-registration
-- that grants the admin role. A single flat 'admin' role exists (no sub-roles).
--
-- Prerequisites:
--   * The person has already signed in at least once, so a public.users row
--     exists for their email (the row is created on first auth, not by this SQL).
--
-- How to run:
--   * Supabase SQL editor, or `psql "$DATABASE_URL" -f supabase/admin/promote-admin.sql`.
--   * Replace the email literal below before running.
--   * Idempotent — safe to re-run; re-running on an already-admin row is a no-op.
--
-- This file lives OUTSIDE supabase/migrations/ on purpose: it is a deliberate
-- DBA action, not part of the automated, validated migration sequence.
-- =============================================================================

update public.users
set role = 'admin',
    updated_at = now()
where email = 'REPLACE_ME@example.com';

-- Verify exactly one row was promoted:
--   select id, email, role, status from public.users where email = 'REPLACE_ME@example.com';
