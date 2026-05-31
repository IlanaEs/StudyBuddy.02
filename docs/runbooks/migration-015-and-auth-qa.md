# Migration 015 (`is_demo`) + Auth Foundation QA Status

_Last updated: 2026-05-31_

## Migration 015 — applied to live Supabase

`supabase/migrations/015_demo_seed_flags.sql` adds demo/seed flags so dev/staging
data can be filtered from production surfaces.

- **Applied to the live Supabase project** (`ucptoyqlsysnxfjgqttq`).
- `public.users.is_demo` — exists (`boolean not null default false`)
- `public.teacher_profiles.is_demo` — exists (`boolean not null default false`)
- Indexes `users_is_demo_idx` and `teacher_profiles_is_demo_idx` — exist
- Migration history includes `015_demo_seed_flags`.

This was the root cause of an earlier teacher-onboarding `500` ("Failed to
activate teacher profile") and matching failures: `activateTeacherProfile`
writes `is_demo`, and `matching.repository.ts` filters `.eq('is_demo', false)`.
No application code change was required — the column simply had to exist.

### Applying migrations on this project

`supabase db push` may refuse with a migration-history mismatch (the remote
history contains versions not present locally). When that happens, either:

1. Reconcile history (`supabase migration repair ...`) then `supabase db push`, or
2. Apply the migration SQL via the Supabase Dashboard → SQL Editor.

## Auth Foundation QA

Real-flow end-to-end harness (API + live DB):

```bash
node scripts/qa-auth-flow-e2e.mjs
```

It exercises, for teacher / parent / student:
signup → duplicate-signup (409) → login → `/me` → role profile creation →
onboarding (teacher: complete + availability) → logout → re-login, and inspects
the DB for duplicate users, orphan rows, correct foreign keys and roles.

**Latest result: 82/82 checks passed.** Specifically:

- Teacher onboarding completion: `200`
- Availability slot creation: succeeded (`count=2`)
- Matching query with `.eq('is_demo', false)`: no schema error
- No duplicate users, no orphan students, correct role→dashboard mapping

Local QA accounts + `DEV_AUTH_BYPASS` are documented in
[../QA_USERS.md](../QA_USERS.md).
