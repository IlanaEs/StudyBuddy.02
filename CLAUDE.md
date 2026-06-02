# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

StudyBuddy.02 is a **CRM-driven matchmaking operating system for private education** — explicitly *not* a tutor marketplace. The product philosophy (curated matching over infinite browsing, lifecycle integrity, backend-enforced permissions) is binding architecture, not aspiration. Read `agents/00_AGENTS.md` (the "operating constitution") and `agents/API_Contracts.md` before making non-trivial product decisions; they override implementation convenience when they conflict.

## Commands

Run from the repo root. This is an npm workspaces monorepo (`apps/backend` = `@studybuddy/backend`, `apps/frontend` = `@studybuddy/frontend`).

```bash
npm install              # install all workspaces

npm run dev:backend      # backend only — tsx watch, http://localhost:4000
npm run dev:frontend     # frontend only — vite, http://localhost:3001
npm run dev              # both (uses `&`; on Windows PowerShell run the two separately)

npm run build            # build all workspaces
npm run typecheck        # tsc --noEmit across all workspaces
npm run lint             # same as typecheck — there is NO eslint; lint === tsc --noEmit
npm run test             # vitest run across all workspaces
npm run db:validate      # validate supabase/migrations against the locked schema
```

Backend tests use **Vitest** (`apps/backend/tests/**/*.test.ts`, node environment, supertest for HTTP). The frontend currently has no tests (`vitest run --passWithNoTests`).

```bash
# single backend test file / single test
npm test --workspace @studybuddy/backend -- tests/matching.test.ts
npm test --workspace @studybuddy/backend -- -t "approves a pending booking"
```

`npm run db:validate` (`scripts/validate-supabase-migrations.mjs`) is a hard gate: it asserts exact migration filenames/order, every expected table + RLS enablement, exact enum names and values, the Supabase Auth FK link, and that **no RLS policy is unrestricted (`using (true)`) or granted to `anon`**. Run it after any change under `supabase/migrations/`.

## Environment

Three env files, copied from `.example` siblings. The backend reads via `apps/backend/src/config/env.ts` (Zod-validated; Supabase/DB vars are *optional* so the server boots without them, but `requireEnv()` throws at the point of use). See `docs/local-env-setup.md`.

```bash
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env       # SUPABASE_*, DATABASE_URL, FRONTEND_ORIGIN, PORT
cp apps/frontend/.env.example apps/frontend/.env      # VITE_API_BASE_URL, VITE_SUPABASE_*
```

## Backend architecture

Express + TypeScript, ESM (note `.js` extensions in relative imports — required by `"type": "module"` + Node resolution). `src/server.ts` boots; `src/app.ts` wires every domain router under `/api/*` (plus unauthenticated `/health`).

**Strict per-domain layering.** Each feature folder (`auth/`, `matching/`, `lessons/`, `bookingRequests/`, `teacherAvailability/`, `studentIntakes/`, etc.) follows the same vertical slice:

```
*.routes.ts       middleware chain + endpoint wiring
*.controller.ts   HTTP in/out only — parse req, call service, shape `{ data }`
*.service.ts      business logic, lifecycle enforcement, transactions
*.repository.ts   all DB access (SQL via postgres.js / Supabase client)
*.validation.ts   Zod schemas
*.types.ts        domain types
```

Keep these boundaries — controllers never touch the DB; repositories never enforce permissions.

**Cross-cutting infrastructure:**
- `middleware/authMiddleware.ts` — `requireAuth` (verifies Supabase JWT → `request.auth`), `requireRole`, `requireAnyRole`. Routers typically call `router.use(requireAuth)` then add role guards per endpoint.
- `middleware/asyncHandler.ts` — wrap every async controller so rejections reach the error handler.
- `validation/requestValidation.ts` — `validateRequest(schema)` middleware.
- `errors/AppError.ts` + `errors/errorHandler.ts` — throw `new AppError(message, statusCode)`; the terminal handler emits `{ error }` and converts anything else to a generic 500. **Never leak raw DB errors.**
- `auth/ownership.ts` — ownership/relationship assertions (e.g. `assertStudentAccess`) used by services.
- `db/transaction.ts` — `withTransaction(sql => ...)` over a shared postgres.js pool; lifecycle-mutating actions must be atomic.
- `supabase/supabaseClients.ts` — `createSupabasePublicClient()` (anon) vs `createSupabaseAdminClient()` (service role; backend only).

**Matching engine** (`src/matching/`) is the reference example of the locked product rules: a read path (`runMatchingRead`, no writes) and a write path (`runMatching`, transactional lock→delete→insert→update, idempotent). It runs an ordered in-memory fallback loop (`strict → budget_expansion → online_fallback → partial_results`) and returns **at most 3 ranked matches** (`MAX_MATCH_RESULTS`). Do not turn this into unbounded marketplace browsing.

## Frontend architecture

React 19 + Vite + TypeScript. **Mantine** is the component library and **Tailwind** (via PostCSS, `tailwind.config.ts`) the utility layer — both are in use; `lib/cn.ts` merges classes. `@tabler/icons-react` + `lucide-react` for icons, `framer-motion` for motion, `zustand` for state.

- `src/main.tsx` → `providers/AppProviders.tsx` → `app/App.tsx` (all routes) → `app/AppShell.tsx`.
- **Auth** (`auth/AuthProvider.tsx`): Supabase browser session is the source of truth; on every auth-state change it calls `/api/auth/me` to resolve the local user + profile *atomically* (avoids a user-set/profile-null window). `ProtectedRoute` gates routes and accepts `allowedRoles`. Call `refreshProfile()` after operations that change profile state (e.g. completing onboarding).
- `api/client.ts`: `apiRequest<T>()` returns a discriminated `{ data } | { error }` — always narrow with `'error' in response` before using `.data`. Pass the Supabase access token to authenticate.
- Feature-first organisation: `features/matching/` bundles its own `pages/`, `components/`, `store/`, `types/`, `utils/`, `data/` (mock data lives here, clearly named `mock*`). Shared/page-level routes live in `routes/` and `pages/`.

### Teacher onboarding wizard (v2)

`pages/TeacherOnboardingPage.tsx` is a single `step`-state machine rendered as **8 screens** (Hebrew-primary RTL; English in parens **only** on main headers and core action buttons):

1. Account Connection (Google-only auth-gate overlay) · 2. Experience & Expertise · 3. Subjects, Levels & Style · 4. Availability & Synchronization · 5. Teaching Operations Engine · 6. Pricing Framework · 7. Verifications & Compliance · 8. Profile Preview — then **Processing** (`step === 8`) and **Success** (`step === 9`).

- **Account Connection is the `showAuthGate` overlay**, not a numbered content step. Content steps are `step` 1–7 → screens 2–8; the progress tracker shows `screen = step + 1` of `TOTAL_SCREENS_V2`.
- Screen UIs live in `components/onboarding/v2/screens/Screen{1..8}*.tsx`; shared primitives (`WizardShell`, `BentoCard`, `ScreenHeader`, `ChipSelect`, `CardSelect`, `SquareCheckbox`, `NavButtons`, `NeonProgressTracker`, `FloatingLabelInput`, `BrutalistSlider`) in `components/onboarding/v2/`.
- Screens are presentational (`data`/`update`/`errors`/nav props). The page keeps all wired logic and injects the **GCal sync card + weekly grid** (Screen 4) and the **academic autocomplete** (Screen 2) as slots, so OAuth/draft/calendar wiring is unchanged.
- Validation is per content step in `validateTeacherOnboardingStep` (1–6 carry rules; 7 = Preview); the submit payload (`completeOnboarding`) is field-based and independent of the step split. The Availability auto-sync effect is keyed to `step === 3`.
- **Design tokens are scoped**, not global: the new palette/animations live under a `.tow` wrapper class in `styles.css` (`--tow-bg #175655`, `--tow-card #3f7e76`, `--tow-ink #016c7c`, `--tow-neon #00f6ff`, `--tow-gold #ffd166`, `--tow-orange #fc6d17`, `--tow-alert #e22b57`, `--tow-success #bbe341`; monospace for numeric states) with a TS mirror `towTokens` in `design/tokens.ts`. The app-wide `:root` theme is untouched.

## Non-negotiable conventions

These come from `agents/00_AGENTS.md` and `agents/API_Contracts.md` and are enforced/expected throughout:

- **API envelope:** success is `{ "data": ... }`, error is `{ "error": "message" }`. Never a top-level success boolean, never mixed formats. Success is signalled by HTTP status + presence of `data`.
- **API payload fields are `snake_case`**; IDs are UUID strings; timestamps are ISO 8601. The frontend may map to camelCase internally, but contracts stay snake_case.
- **DB naming is sacred:** `snake_case`, lowercase, plural tables, singular enum values, explicit FK names.
- **Enums are locked architecture.** Never invent statuses. The canonical sets live in `supabase/migrations/001_enums_and_common.sql` and are asserted by `db:validate` (e.g. `booking_status: pending|approved|rejected|expired|cancelled`, `lesson_status: scheduled|completed|cancelled|no_show`, `intake_status: open|matched|closed`). If a new enum/state is genuinely needed, surface it as `[MISSING PRODUCT DECISION]` rather than adding it.
- **Permissions are backend-enforced.** Frontend visibility is never security: validate ownership/relationship/role in services and rely on Supabase RLS. Assume the frontend can be bypassed.
- **MVP boundary:** no payments/Stripe/invoicing, no AI tutoring/grading, no social feeds or public discovery feeds, no unbounded list endpoints. Mark out-of-scope work `[OUT OF MVP]` instead of building it.
- Booking approval and other lifecycle transitions must be **atomic** (`withTransaction`) and must prevent double-booking.

## Source-of-truth documents (`agents/`)

When a change touches product/lifecycle/permission/contract behaviour, align with these (higher in the list wins on conflict):

- `00_AGENTS.md` — the constitution (identity, locked systems, hard-failure conditions)
- `API_Contracts.md` — response envelope, naming, per-domain contract examples
- `02_System_Architect_Agent.md`, `05_Frontend_Agent.md`, `06_Backend_Agent.md`, `07_Supabase_Data_Agent.md`
- `Event Lifecycle Source of Truth.md`, `Permissions Source of Truth.md`, `Frontend Source of Truth.md`
- `09_Codex_Task_Template.md` — the required task format for implementation work
