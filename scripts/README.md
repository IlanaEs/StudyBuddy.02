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
