# Handoff guide — for Ilana's Claude Code (macOS)

This folder is the **working, consolidated StudyBuddy.02 app**. It builds cleanly, runs
(backend `:4000`, frontend `:3001`), and **all 164 unit tests + the 82/82 auth E2E pass**.
It was assembled on a Windows PC from your `fix/migration-015-deployment-gap` branch (PR #21 —
your most complete branch) plus fixes for merge-corruption that had broken `main` on GitHub.

Your repo on GitHub still has **~28 branches and several open PRs**, and its `main` is the
broken/fragmented version. The goal of this guide is:

1. Get **this** code onto your Mac and make it your repo's `main`.
2. **Push from your Mac under your GitHub account** (nothing is pushed from Adir's machine — his
   GitHub never appears).
3. **Collapse everything into one `main`** and delete all the other branches/PRs.
4. Apply **two Supabase fixes** that make the remaining backend features work.
5. **Verify** the whole thing end-to-end.

> Read this top-to-bottom first. Commands are macOS/zsh. Replace `<...>` placeholders.

---

## Part A — Make this code your `main` and push it (as you)

You will copy the working files into your existing clone and commit them as **one** new commit
authored by you, then delete every other branch. This is **additive** (no force-push, no history
rewrite).

### A1. Set your git identity (so commits are yours)
```bash
cd <your-clone-of-StudyBuddy.02>
git config user.name "Ilana Estrin"          # your name
git config user.email "<your-github-email>"  # the email on your GitHub account
git remote -v                                # confirm origin = github.com/IlanaEs/StudyBuddy.02
```

### A2. Safety net — snapshot the current remote state
```bash
git fetch origin
git checkout main
git switch -c backup/pre-consolidation        # a local backup branch of the old main
git switch main
```

### A3. Copy the new working files over your clone
Adir will give you this folder (AirDrop/USB/zip — **not** via GitHub). Say it lands at
`~/Downloads/StudyBuddy.02-working`. Overlay it onto your clone, excluding git + installed deps:
```bash
rsync -a --delete \
  --exclude '.git' --exclude 'node_modules' --exclude 'dist' --exclude '*.env' \
  ~/Downloads/StudyBuddy.02-working/ ./
```
`--exclude '*.env'` keeps your local secrets; you'll set env in Part B.

### A4. Commit the consolidation (one clean commit, authored by you)
```bash
git add -A
git status                 # sanity-check what changed
git commit -m "Consolidate working app into main: parent dashboard, lessons, booking, matching, auth, onboarding"
```

### A5. Delete every other branch — local and remote
Local:
```bash
git branch | grep -vE '^\*| main$' | xargs -r git branch -D
```
Remote (deleting a branch auto-closes its PR on GitHub):
```bash
git fetch --prune
git branch -r | grep -v 'origin/main' | grep -v 'HEAD' | sed 's#origin/##' | xargs -r -n1 git push origin --delete
```
If any branch is "protected," unprotect it first in GitHub → Settings → Branches.

### A6. Push `main` from your Mac (your account)
```bash
git push origin main
```
Because you ran this from **your** Mac with **your** GitHub credentials, GitHub records **you** as
the author and pusher. Adir's machine pushed nothing.

> Want a single-commit history instead of "old main + 1 commit"? That requires a force-push:
> `git reset $(git commit-tree HEAD^{tree} -m "StudyBuddy.02") && git push --force origin main`.
> Only do this if you're sure — it rewrites `main` history. The additive path above is safer.

---

## Part B — Two Supabase fixes (required for the full app to work)

The app has two layers: most features use the Supabase **REST** client (works anywhere), but
**matching-write, booking requests, lessons, and the parent dashboard** need a direct Postgres
connection + one migration that the live database is missing. These could not be fixed from Adir's
PC (his network has no IPv6 route to Supabase's direct DB host). On your Mac with the Supabase
dashboard, they're quick.

### B1. Apply migration 014 (creates `lesson_confirmations` + `homework_tasks`)
The live DB is missing these two tables (migration `supabase/migrations/014_parent_dashboard.sql`
was never applied). Without them the **parent dashboard** and **lesson completion** 500.

- Supabase dashboard → **SQL Editor** → paste the full contents of
  `supabase/migrations/014_parent_dashboard.sql` → **Run**.
- Then reload the API schema cache: SQL Editor → run `notify pgrst, 'reload schema';`
- (Optional) confirm all migrations are present with `npm run db:validate` (file-level check).

### B2. Use the IPv4 connection-pooler URL for `DATABASE_URL`
The backend's transactions (`apps/backend/src/db/transaction.ts`) connect via `DATABASE_URL`. The
default `db.<ref>.supabase.co:5432` host is **IPv6-only**; many networks can't reach it. Use the
**pooler** (IPv4) string instead:

- Supabase dashboard → **Project Settings → Database → Connection string → "Connection pooling"**
  (Session mode, port `5432`). It looks like:
  `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`
- Put that in **`apps/backend/.env`** as `DATABASE_URL=...` (and root `.env` if you use it).

> If your Mac/network *does* have IPv6, the original `db.<ref>.supabase.co` URL may work too — but
> the pooler URL is the reliable choice and what we recommend committing to `.env.example` notes.

---

## Part C — Run and verify everything

```bash
npm install
# env files (fill Supabase values from the dashboard; see apps/*/.env.example and docs/local-env-setup.md)
cp apps/backend/.env.example apps/backend/.env     # then edit: SUPABASE_*, DATABASE_URL (pooler!), DEV_AUTH_BYPASS=true, FRONTEND_ORIGIN=http://localhost:3001
cp apps/frontend/.env.example apps/frontend/.env   # then edit: VITE_SUPABASE_*

npm run typecheck        # expect: clean
npm run build            # expect: both apps build
npm test                 # expect: 164 passed
npm run db:validate      # expect: "Supabase migration validation passed."

# start the backend, then in another shell start the frontend
npm run dev:backend      # http://localhost:4000
npm run dev:frontend     # http://localhost:3001

# end-to-end checks against the live DB (backend must be running, DEV_AUTH_BYPASS=true)
node scripts/qa-auth-flow-e2e.mjs        # expect: 82/82
node scripts/verify-matching-e2e.mjs     # expect: ranked matches (needs B2)
node scripts/verify-lifecycle-e2e.mjs    # full journey: needs B1 + B2 — see its output
```

`scripts/verify-lifecycle-e2e.mjs` walks the entire product flow (teacher onboard → availability →
student intake → matching → booking → approve → lesson → complete with note+homework → parent
dashboard → confirm). If a step fails it prints exactly which one and why — that's your punch-list.

To seed demo data for clicking through the UI:
```bash
STUDYBUDDY_ENV=development npm run db:seed:taxonomy
STUDYBUDDY_ENV=development npm run db:seed:demo
STUDYBUDDY_ENV=development npm run qa:seed-users        # 10 logins, password QaPass123! (see docs/QA_USERS.md)
STUDYBUDDY_ENV=development node scripts/seed-parent-dashboard.mjs --allow-remote-dev-seed   # needs B1 applied
```

---

## Part D — Making the app faster (performance)

The app is reported to feel slow. The biggest cause is almost certainly the **backend doing a
network round-trip to Supabase on every authenticated request**, made worse by a duplicate router.
These are ordered by impact. **Measure first** (see D0) so you fix the real bottleneck.

### D0. Measure before optimizing
Add quick timing so you know where the time goes instead of guessing:
- Backend: log per-request duration (a tiny Express middleware logging `method path status ms`).
- Network: open the browser **DevTools → Network** tab on a slow screen — see whether time is in the
  API calls (backend) or in loading the JS/CSS bundle (frontend).
- Supabase: **Dashboard → Reports** shows slow queries.

### D1. Stop calling Supabase Auth on every request  ⭐ biggest win
`apps/backend/src/auth/authService.ts` → `verifyAccessToken()` calls
`publicClient().auth.getUser(accessToken)` on **every** protected request. That's a full network
round-trip to Supabase Auth before your handler even runs — on every API call.

Supabase access tokens are **JWTs**. Verify the signature **locally** instead of phoning home:
- Use `jose` (or `jsonwebtoken`) to verify the token with the project's JWT secret
  (Supabase → Settings → API → JWT Secret), or the project's JWKS for asymmetric keys.
- Read `sub` (auth user id) / `role` from the verified payload, then do the existing local
  `findLocalUserByAuthId` DB lookup (fast, indexed) — no Auth-server call.
- Optionally cache the resolved local user for ~30–60s per token to skip even the DB hit.

This typically cuts tens-to-hundreds of ms off **every** request.

### D2. Fix the duplicate `/api/teachers` mount (auth runs twice)
`apps/backend/src/app.ts` mounts **two** routers on `/api/teachers`
(`teacherOnboardingRouter` then `teacherRouter`), each with its own `requireAuth`. Every teacher
request therefore verifies the token **twice** (two of the round-trips from D1). Merge the calendar
routes into a single teacher router (one `requireAuth`). Removes a whole duplicate auth check per
teacher request.

### D3. Reuse Supabase clients instead of creating one per call
`apps/backend/src/supabase/supabaseClients.ts` runs `createClient(...)` on every call, and
`authService` calls it on every request. Create the public + admin clients **once** at module load
and reuse the singletons. Cheap change, removes per-request client construction.

### D4. Use the IPv4 pooler `DATABASE_URL` (see Part B2)
Besides reliability, the pooler reduces per-transaction connection overhead for the
matching/booking/lessons SQL paths. Already covered in B2.

### D5. Parallelize independent DB reads + confirm indexes
- In services that `await` several independent reads in sequence (e.g. dashboard/matching
  assembling teacher names, lessons, confirmations), batch them with `Promise.all`. Some already do
  — scan `parentDashboard.service.ts` and `matching` for sequential `await`s that don't depend on
  each other.
- Make sure hot lookup columns are indexed (the matching engine got indexes in migration `009`; do
  the same for `lessons.student_id`, `booking_requests.teacher_id`, `availability_slots.teacher_id`
  if a query is slow in Supabase Reports).

### D6. Shrink + code-split the frontend bundle
`npm run build` emits a single **~593 kB JS (≈170 kB gzip) + ~275 kB CSS** chunk and warns about
size. The whole app (every route, Mantine, Framer Motion) loads before the first screen.
- **Lazy-load routes** in `apps/frontend/src/app/App.tsx` with `React.lazy()` + `<Suspense>` so the
  matching wizard / dashboards / onboarding load on demand, not upfront.
- Add `build.rollupOptions.output.manualChunks` in `vite.config.ts` to split vendor (Mantine,
  Framer Motion) from app code — better browser caching between deploys.
- Audit heavy deps: if **Framer Motion** is only used in a few places, lazy-load those; drop unused
  Mantine submodules.

### D7. Quick wins
- Serve the frontend build behind gzip/brotli + long-cache headers (Vercel does this automatically;
  for self-hosting, enable compression).
- Add DB-backed pagination to any list endpoint that can grow (the contract already expects
  `page`/`limit`) so responses stay small.

---

## What was changed before this handoff (so you know the diff from your branch)

- **Repaired merge-corruption** that broke `main`'s build (duplicated code blocks / unclosed
  tags) across ~11 files from the parent-dashboard merges — your PR #21 versions were used where
  clean, hand-fixed otherwise.
- **Fixed `scripts/validate-supabase-migrations.mjs`** for cross-platform paths (it crashed on
  Windows; the fix is harmless on macOS).
- **Updated stale unit tests** to match your refactors (calendar double-auth mock; onboarding
  re-pointed to the new repository modules). All 164 pass.

## Known issues to review (documented, not changed)

1. **`/api/teachers` is mounted twice** in `apps/backend/src/app.ts` (`teacherOnboardingRouter`
   then `teacherRouter`). The onboarding routes in `teacherRouter` are shadowed, and every teacher
   request verifies the JWT **twice**. Recommend consolidating to one mount.
2. **Legal declarations are optional** on onboarding-complete (the schema uses
   `legalTax: z.boolean().optional()`); the older flow required them all `true`. Decide if that's
   intended for a platform serving minors.
3. **No idempotency guard** on onboarding-complete — it re-runs the upserts each call (safe, but
   re-does work).

See `FEATURE_STATUS.md` for the full feature-by-feature verification matrix.
