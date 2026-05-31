# Local Environment Setup

Copy each example file to a local environment file before running the app:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

Fill in the missing Supabase values from the Supabase project dashboard:

- `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY`: Project Settings > API > Project API keys > anon public key.
- `SUPABASE_SERVICE_ROLE_KEY`: Project Settings > API > Project API keys > service_role key. Use this only on the backend.
- `DATABASE_URL`: Project Settings > Database > Connection string. Use the password for the project database user.

Never commit real secrets, local `.env` files, service role keys, or database passwords.

## Full Local E2E Setup

For onboarding -> intake -> matching QA, the database must contain canonical
subjects and local/dev demo teacher data. After migrations are applied and the
backend env points at the intended development Supabase project, run one of the
explicit seed commands below.

Production-safe taxonomy only:

```bash
npm run db:seed:taxonomy
```

Local all-in demo setup:

```bash
npm run db:seed:local
```

Remote development/staging demo setup:

```bash
STUDYBUDDY_ENV=development npm run db:seed:demo -- --allow-remote-dev-seed
```

The demo seed is deterministic and clearly marked as dev/demo data:

- canonical active subjects for matching
- `devseed.teacher.*@studybuddy.local` local teacher users
- verified, active teacher profiles
- teacher subject links
- active availability slots
- Auth metadata: `is_demo=true`, `seed_type=matching_mvp`
- DB flags when migration `015_demo_seed_flags.sql` is applied:
  `users.is_demo=true`, `teacher_profiles.is_demo=true`

Seed safety rules:

- `db:seed:taxonomy` is canonical taxonomy and can be used for production only
  with `ALLOW_PRODUCTION_SEED=true`.
- `db:seed:demo` and `db:seed:local` are not production-safe.
- Remote development/staging demo seed requires both an explicit environment
  (`STUDYBUDDY_ENV=development` or `STUDYBUDDY_ENV=staging`) and
  `--allow-remote-dev-seed`.
- Ambiguous remote environments are rejected.
- Production matching excludes `teacher_profiles.is_demo=true` and
  `professional_status='dev_seed_teacher'`.

Then start the app:

```bash
npm run dev:backend
npm run dev:frontend
npm run check:local
```

Expected local URLs:

- Frontend: `http://127.0.0.1:3001`
- Backend health: `http://127.0.0.1:4000/api/health`

## Deployment Notes

Production environments must set:

```bash
NODE_ENV=production
STUDYBUDDY_ENV=production
```

Do not run demo seeds in production. If canonical taxonomy needs to be updated
in production, run only `db:seed:taxonomy` with an explicit review and
`ALLOW_PRODUCTION_SEED=true`.

Staging may use demo data for QA, but it must be marked with `is_demo=true` and
kept out of production analytics/reports.
