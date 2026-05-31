# StudyBuddy.02 Docs

This folder is reserved for implementation notes, architecture records, and future technical documentation.

Product and agent governance remains in `agents/`.

## Environment And Seed Boundaries

StudyBuddy uses explicit environment classification for seed scripts:

- `local`: localhost Supabase targets.
- `development`: remote development projects.
- `staging`: staging/preview projects.
- `production`: production projects.

Seed commands are intentionally split:

- `npm run db:seed:taxonomy` inserts canonical taxonomy such as matching subjects.
- `npm run db:seed:demo` inserts demo runtime entities such as teachers and availability.
- `npm run db:seed:local` runs the local demo setup.

Demo entities must never be treated as real production data. They are tagged via
Auth metadata and, once migrations are applied, `users.is_demo` and
`teacher_profiles.is_demo`.
