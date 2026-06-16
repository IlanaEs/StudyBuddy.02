# StudyBuddy.02

A **CRM-driven matchmaking platform for private education** (Hebrew / RTL). It connects
**students and parents** with **teachers** through a curated matching flow (max 3 results — not a
marketplace), then runs the full operational lifecycle: booking → lesson → post-lesson notes,
homework, and parent confirmation. Roles: **teacher, student, parent, admin**.

> **Status: READY FOR FINAL SUBMISSION.** Feature-complete on the core flows and verified
> end-to-end against the **live production deployment** (Vercel frontend + Render backend + Supabase).
> The **multi-account architecture** (one Google identity → separate Teacher / Student / Parent
> accounts) is complete and QA-passed in both directions. Final tested-flows matrix, the E2E runbook,
> and the demo script live in [`docs/QA_FINAL.md`](docs/QA_FINAL.md); the per-feature verification
> matrix in [`FEATURE_STATUS.md`](FEATURE_STATUS.md).
>
> **Production:** frontend `https://study-buddy-fawn.vercel.app` · backend
> `https://studybuddy-02.onrender.com` (Render free tier — first request after idle is a cold start).

## Table of contents
- [Architecture](#architecture) · [Tech stack](#tech-stack) · [Setup](#setup) · [Run](#run)
- [The product workflow](#the-product-workflow) · [Routes](#frontend-routes)
- [Testing & QA](#testing--qa) · [Database](#database) · [Conventions](#conventions) · [Known gaps](#known-gaps)

---

## Architecture

npm-workspaces monorepo:

```
apps/
  backend/    Node + Express + TypeScript (ESM) REST API, Supabase Auth + Postgres
  frontend/   React 19 + Vite + TypeScript SPA (Mantine + Tailwind, Hebrew/RTL)
supabase/migrations/   SQL schema (001–026), gated by db:validate
scripts/               seed + QA/E2E verification scripts
agents/                product/architecture source-of-truth docs (governance)
docs/                  env setup, QA users, runbooks
```

**Backend** — strict per-domain vertical slices. Every feature folder under `apps/backend/src`
follows: `*.routes.ts` (middleware + wiring) → `*.controller.ts` (HTTP in/out, shapes
`{ data }`) → `*.service.ts` (business logic, lifecycle, transactions) → `*.repository.ts` (DB
access) → `*.validation.ts` (Zod) → `*.types.ts`. Cross-cutting: `middleware/authMiddleware.ts`
(`requireAuth`/`requireRole`/`requireAnyRole`), `errors/AppError.ts` + `errorHandler.ts`,
`db/transaction.ts` (`withTransaction` for atomic writes), `supabase/supabaseClients.ts` (anon vs
service-role). The **matching engine** (`src/matching/`) is rule-based, returns **≤3 ranked
matches**, and writes transactionally (lock → delete → insert → update).

**Frontend** — feature-first. `src/main.tsx` → `providers/AppProviders.tsx` → `app/App.tsx`
(routes) → `app/AppShell.tsx`. Auth lives in `auth/AuthProvider.tsx`: the Supabase browser session
is the source of truth, and every auth change resolves the local user+profile via `GET
/api/auth/me`. `api/client.ts` exposes `apiRequest<T>()` returning a discriminated
`{ data } | { error }`.

See [`CLAUDE.md`](CLAUDE.md) for the deeper architecture notes.

### Multi-account architecture

One Google sign-in (one Supabase `auth.users` / local `users` **identity**) can own **multiple
separate StudyBuddy accounts** — a Teacher, a Student, and a Parent under the **same email** — each
with its own role, onboarding, dashboard, and data. The **only** shared thing is the auth identity.

- **`users`** = the identity (1:1 with `auth.users`; `email` is unique here). **`accounts`** = one row
  per `(identity, role)` (migrations `024`–`026`); a `is_default` account preserves single-account
  behavior.
- **Active account is chosen per request** via the **`X-Account-Id`** header (mirrors the
  `x-admin-qa-role` convention). No header → the default account. The backend
  (`verifyAccessToken` → `resolveActiveAccount`) validates the header belongs to the identity (else
  403) and mirrors the active account's **role** onto the request, so every role guard/ownership
  check branches on the *selected* account. `X-Account-Id` is in the CORS `allowedHeaders`.
- **Frontend**: `auth/activeAccount.ts` is the header store (localStorage + in-memory, read by
  `api/client.ts`); `AuthProvider.switchAccount(id)` switches and re-resolves `/me`; the choice is
  **persisted across refresh** (`resolveRestorableAccountId`, validated against the server-fresh
  account list so a stale/foreign id is never sent). `AccountSwitcher` adds/switches accounts; a
  post-login picker appears only when an identity owns >1 account.
- **Ownership is role-scoped, not identity-wide.** Student/child profiles are resolved by the
  **active account's role** — a Student flow resolves the identity's **own** profile (`students.user_id`),
  a Parent flow resolves a **child** (`students.parent_user_id`). This prevents one identity's
  accounts from cross-using each other's profiles. (Permissions remain backend-enforced; the intake
  insert uses the service-role client, so the ownership gate is `assertStudentAccess`, not RLS.)

## Tech stack

- **Frontend**: React 19, Vite 6, TypeScript 5.7, React Router 7, Mantine 9 (core/form/hooks/
  modals/notifications), Tailwind 3, Zustand 5, Framer Motion, lucide-react / Tabler icons,
  `@supabase/supabase-js`.
- **Backend**: Express 4, TypeScript 5.7 (ESM — note `.js` import suffixes), `@supabase/supabase-js`,
  `postgres` (direct SQL for transactions), Zod, cors, dotenv; `tsx` for dev.
- **Database/Auth**: Supabase (hosted Postgres + Auth). Migrations in `supabase/migrations/`.
- **Tests**: Vitest + Supertest (backend).

## Setup

Prerequisites: **Node ≥ 20**, **npm ≥ 10**, a Supabase project.

```bash
npm install

# env files — copy the examples, then fill in Supabase values from the dashboard
cp apps/backend/.env.example  apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

**`apps/backend/.env`** — key vars:
| Var | Notes |
|---|---|
| `PORT` | backend port (default `4000`) |
| `FRONTEND_ORIGIN` | CORS origin — must match the frontend URL, i.e. `http://localhost:3001` |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | from Supabase → Settings → API |
| `DATABASE_URL` | direct Postgres URL. **Use the "Connection pooling" (IPv4) string** if your network can't reach the IPv6-only `db.<ref>.supabase.co` host |
| `DEV_AUTH_BYPASS` | `true` for local dev — auto-confirms signups (no email round-trip) |

**`apps/frontend/.env`**: `VITE_API_BASE_URL` (`http://localhost:4000`), `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`. Details in [`docs/local-env-setup.md`](docs/local-env-setup.md).

**Database**: apply **all** migrations `001–026` to your Supabase project (SQL Editor or
`supabase db push`) — the app expects the full set. Notes: `014_parent_dashboard.sql` is required for
the parent dashboard + lesson completion (if those 500, apply it and run
`notify pgrst, 'reload schema';`), `023_teacher_approval_status.sql` gates teacher matchability, and
**`024`–`026` add the multi-account schema** (the `accounts` table + `account_id` backfill) — required
for the multi-account flows. Verify the migration *files* are well-formed with `npm run db:validate`.
Migrations are applied **manually** (the prod deploy can't reach the direct PG host from CI).

## Run

```bash
npm run dev:backend     # http://localhost:4000   (tsx watch)
npm run dev:frontend    # http://localhost:3001   (vite)
# or both at once (POSIX shells): npm run dev
```

Default ports: **backend 4000**, **frontend 3001**. Health: `GET http://localhost:4000/api/health`.

Build / quality gates:
```bash
npm run build       # tsc + vite build (both apps)
npm run typecheck   # tsc --noEmit (both apps)
npm run lint        # alias for typecheck (no eslint configured)
npm test            # vitest (backend unit/integration)
npm run db:validate # assert migration filenames/order, tables, enums, RLS
```

## The product workflow

1. **Auth** — Google-only OAuth via `/login` → `/auth/callback`; role selection/provisioning happens
   inside the student/parent and teacher onboarding flows through
   `POST /api/auth/complete-oauth-signup`. Backend verifies the Supabase JWT and resolves a local
   `users` row + role profile.
2. **Teacher onboarding** (`/teacher-onboarding`) — multi-step wizard: name + professional status,
   subjects & levels, **availability** (manual grid **or** Google Calendar sync), rate, and legal
   declarations. Drafts auto-save (`PUT /api/teachers/me/onboarding`); completion
   (`POST .../complete`) creates an active `teacher_profile` with subjects + availability.
3. **Matching** (`/onboarding/matching`) — student/parent intake wizard (account type, goal, grade,
   subject, budget, availability, learning style/preferences). Submitting creates a
   `student_intake` and runs the engine (`POST /api/matching/:intakeId/run`), returning **≤3 ranked
   teachers** → `/onboarding/results`.
4. **Booking** (`/onboarding/booking`) — pick a slot + message → `POST /api/booking-requests` →
   `/onboarding/confirmation`.
5. **Teacher inbox** (`/teacher/inbox`) — teacher sees requests (`GET /api/booking-requests`) and
   approves/rejects (`POST /api/booking-requests/:id/respond`). Approval **atomically creates a
   scheduled lesson** (with a meeting link).
6. **Lesson lifecycle** (`/teacher/lessons`) — teacher completes a lesson
   (`POST /api/lessons/:id/complete`) with a shared note + homework tasks, or marks
   cancelled/no-show (`PATCH /api/lessons/:id/status`).
7. **Parent dashboard** (`/parent/dashboard`) — children, next lesson, latest update + homework,
   pending confirmations (`GET /api/parents/me/dashboard`). Parent approves a confirmation
   (`POST .../lesson-confirmations/:id/approve`) and updates homework
   (`PATCH .../homework-tasks/:id`).

Also: **student dashboard** (`/student/dashboard`), **admin dashboard** (`/admin/dashboard`) with
academic-repository request approvals.

## Frontend routes

| Path | Page | Access |
|---|---|---|
| `/` , `/teachers` | landing pages | public |
| `/login` , `/auth/callback` | auth | public |
| `/teacher-onboarding` | teacher onboarding wizard | guest→teacher |
| `/onboarding/matching → results → booking → confirmation` | student/parent matching flow | guest/student/parent |
| `/teacher/dashboard` , `/teacher/inbox` , `/teacher/lessons` | teacher area | `teacher` |
| `/parent/dashboard` , `/parent/find-tutor` | parent area | `parent` |
| `/student/dashboard` | student area | `student` |
| `/admin/dashboard` | admin area | `admin` |

A user who owns multiple accounts switches roles in-app via the **account switcher** in the floating
top navbar (no re-login); the active account is sent as `X-Account-Id` and persists across refresh.

## Testing & QA

```bash
npm test                                 # 287 tests (276 backend + 11 frontend)
node scripts/qa-auth-flow-e2e.mjs        # real auth E2E vs live DB — expect 82/82 (needs DEV_AUTH_BYPASS=true)
node scripts/verify-matching-e2e.mjs     # matching E2E (needs db:seed:demo)
node scripts/verify-lifecycle-e2e.mjs    # FULL lifecycle: onboard→availability→intake→match→book→approve→lesson→complete→parent dashboard
```

**Seed data** (idempotent, demo-guarded — they refuse production):
```bash
STUDYBUDDY_ENV=development npm run db:seed:taxonomy   # canonical subjects
STUDYBUDDY_ENV=development npm run db:seed:demo       # 10 demo teachers + availability + demo students/intakes (full QA coverage)
STUDYBUDDY_ENV=development npm run qa:seed-users      # 10 logins (password QaPass123!) — see docs/QA_USERS.md
STUDYBUDDY_ENV=development node scripts/seed-parent-dashboard.mjs --allow-remote-dev-seed  # parent demo (needs migration 014)
```
QA logins (`docs/QA_USERS.md`): `qa.{student,parent,teacher}.{a,b,c}@studybuddy.local`,
`qa.admin@studybuddy.local`, all password `QaPass123!`. ⚠️ These password logins work **only locally
with `DEV_AUTH_BYPASS=true`** — **production auth is Google-only**, so live/demo accounts must be real
Google accounts (see [`docs/QA_FINAL.md`](docs/QA_FINAL.md) → Demo preparation).

## Database

Supabase Postgres. Migrations `supabase/migrations/001–023` create: enums, core users/students/
teachers, matching/booking/lessons, CRM/chat/notifications, RLS, the Supabase-Auth link, security
hardening, teacher onboarding + scheduling, availability exceptions, onboarding drafts, academic
repositories (013), **parent dashboard — `lesson_confirmations` + `homework_tasks` (014)**,
demo `is_demo` flags (015), and 016–023 (Google-only auth, online-only location, lesson calendar
event + files, find-tutor quick wizard, unique student profiles, intake manual-subject, and the
teacher approval gate). `npm run db:validate` enforces filenames, tables, enum values, RLS
enablement, and that no RLS policy is unrestricted or granted to `anon`.

## Conventions

- **API envelope**: success `{ "data": ... }`, error `{ "error": "message" }`. Success is signalled
  by HTTP status; never a top-level boolean.
- **snake_case** API fields; UUID ids; ISO-8601 timestamps. Enums are locked (see
  `supabase/migrations/001_enums_and_common.sql`).
- **Permissions are backend-enforced** (role + ownership + Supabase RLS) — never trust the frontend.
- Lifecycle-changing actions (matching, booking approval) are **atomic** (`withTransaction`).
- MVP boundary: **no payments**, no AI grading, no public discovery feeds, no unbounded lists.

## Known gaps

See [`FEATURE_STATUS.md`](FEATURE_STATUS.md) for the full verification matrix and
[`docs/QA_FINAL.md`](docs/QA_FINAL.md) for the final tested-flows list. The core flows (incl.
parent dashboard, lesson completion, and the full multi-account matrix) are **verified passing in
production**. Remaining minor / non-blocking items:
- **Apply all migrations `001–026`** to your DB (parent dashboard + lesson completion need 014;
  teacher matchability needs 023; multi-account needs 024–026). Done on the production DB.
- **In-app chat** is scaffolded (DB tables + RLS) but not built — intentionally out of MVP scope.
- `/api/teachers` is mounted twice in `app.ts` (onboarding routes shadowed; JWT verified twice per
  request) — recommend consolidating.
- Onboarding legal declarations are optional, and lesson-complete has no idempotency guard — review
  whether intended.

> **Frozen for submission:** the multi-account architecture (`users` / `accounts` / `students` /
> `student_intakes` / `ensureStudentProfile` / `switchAccount` / `X-Account-Id` / active-account
> persistence) is locked — do not modify unless a critical bug is found.
