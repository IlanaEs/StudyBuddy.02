# Scripts

Repository automation scripts for dev/QA workflows.

## Auth model

The app uses **Google OAuth only** — email+password has been removed. These
scripts mint sessions via the Supabase admin client (`auth.admin.createUser` +
`signInWithPassword`) as a dev-only fixture. They then call the app's surviving
auth endpoint (`POST /api/auth/complete-oauth-signup`) to create the
`public.users` row and role assignment, followed by `GET /api/auth/me` to verify.

No script calls the removed `POST /api/auth/signup` or `POST /api/auth/login`
app endpoints (those now return 404).

## Admin provisioning (manual)

The admin console is the highest-privilege surface. Admin is granted **by hand** —
there is no endpoint or self-registration that elevates a user, and a single flat
`admin` role exists (no sub-roles).

- **Production / any target DB:** run [`supabase/admin/promote-admin.sql`](../supabase/admin/promote-admin.sql)
  manually (Supabase SQL editor or `psql`), after editing the email literal. It
  `update`s an existing `public.users` row to `role = 'admin'`. The user must have
  signed in once already (so the row exists). Idempotent.
- **Local/dev only:** [`bootstrap-admin.mjs`](./bootstrap-admin.mjs) (`db:bootstrap:admin`)
  mints a dev admin via the Supabase admin client. It is gated by
  `assertLocalOrDevelopmentOnly` and requires `ADMIN_BOOTSTRAP_PASSWORD`.

These two paths are intentionally separate: the SQL is the DBA action for real
environments; the script is a local fixture.
