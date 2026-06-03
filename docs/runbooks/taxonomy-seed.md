# Runbook — Subject taxonomy seed

## Why this matters

Subject names selected in the UI are resolved to `subjects.id` at submission time:

- **Student intake** (`studentIntakes.repository.ts` → `findSubjectIdByName`) — case-insensitive
  `ilike`. A name not in `subjects` → **HTTP 422** (`"לא נמצא מקצוע מתאים במערכת…"`).
- **Teacher onboarding** (`teacherOnboarding.repository.ts` → `replaceTeacherSubjects`) — exact
  `.in('name', …)` that **silently drops** unmatched subjects. A teacher whose picks don't resolve
  ends up with **zero `teacher_subjects` and is never matchable** — with no error.

So the `subjects` table **must be seeded** in every environment, and the seed must match what the
UI offers.

## Source of truth

- Canonical taxonomy: [`scripts/taxonomy-data.mjs`](../../scripts/taxonomy-data.mjs)
  (`canonicalSubjects`) — single source, side-effect-free.
- The seed script [`scripts/seed-taxonomy.mjs`](../../scripts/seed-taxonomy.mjs) upserts that list
  (`onConflict: 'name'`, idempotent — safe to re-run; never duplicates).
- The two frontend catalogs that must stay subsets of the canonical list:
  - `apps/frontend/src/features/matching/data/subjectsByLevel.ts` (student wizard)
  - `apps/frontend/src/content/teacherOnboardingContent.ts` → `SUBJECTS_BY_LEVEL` (teacher onboarding)

This subset relationship is enforced on every CI run by
`apps/backend/tests/taxonomySync.test.ts` — adding a UI subject that isn't in the canonical list
fails CI.

## Seed an environment

Targets the Supabase project configured in `apps/backend/.env` (`SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`). Set `STUDYBUDDY_ENV` so the guard knows which environment it is.

```bash
# local
STUDYBUDDY_ENV=local        npm run db:seed:taxonomy

# development / staging (remote → prints an intentional-target warning)
STUDYBUDDY_ENV=staging      npm run db:seed:taxonomy

# production — requires an explicit opt-in
STUDYBUDDY_ENV=production ALLOW_PRODUCTION_SEED=true npm run db:seed:taxonomy
```

The script refuses to run against an **ambiguous** environment (set `STUDYBUDDY_ENV`) and against
**production** unless `ALLOW_PRODUCTION_SEED=true`.

## Verify an environment

Read-only check that every canonical subject exists and is active. Exits non-zero on drift.

```bash
STUDYBUDDY_ENV=<env> npm run db:check:taxonomy
```

Run this after seeding, and against **dev / staging / prod** to confirm parity. Sample output:

```json
{ "check": "taxonomy", "environment": "staging", "ok": true, "expected": 48, "present": 48, "missing": [], "inactive": [] }
```

## When the taxonomy changes

1. Edit `canonicalSubjects` in `scripts/taxonomy-data.mjs` (add the subject + a `category`).
2. If the UI should offer it, add it to the relevant frontend catalog(s).
3. Run `npm run test` — the sync guard confirms both catalogs are still subsets.
4. Re-run `npm run db:seed:taxonomy` in each environment (idempotent), then `db:check:taxonomy`.
