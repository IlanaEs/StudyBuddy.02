# Deploying StudyBuddy.02 to Production

This guide walks through deploying StudyBuddy to production **without errors**, in the order that avoids the common chicken‑and‑egg problems.

**Architecture for this deployment:**

- **Frontend** (Vite SPA) → **Vercel**
- **Backend** (Express API) → **Render** (a long‑running Node host) — Railway works identically (see the end)
- **Database + Auth** → **Supabase**

> **Why not the backend on Vercel too?** The backend is a long‑running Express server (`apps/backend/src/server.ts` calls `app.listen`) that uses a persistent `postgres.js` connection pool and serves Google Calendar OAuth callbacks. None of that fits Vercel's stateless serverless functions cleanly. Render runs the server **as‑is**, with no code changes. The repo is already configured for exactly this split — the root `vercel.json` builds the **frontend only**.

```
Browser
  │  loads static SPA
  ▼
Vercel (apps/frontend/dist)
  │  calls VITE_API_BASE_URL
  ▼
Render (Express API: apps/backend)
  │  postgres.js pool + Supabase admin client
  ▼
Supabase (Postgres + Auth + Google OAuth)
```

---

## ⚠️ The one trap to understand first

Two URLs reference each other, and they behave differently:

| Variable | Where | When it takes effect | Consequence |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` (frontend → backend) | Vercel | **Build time** — baked into the JS bundle | Changing it requires a **Vercel redeploy** |
| `FRONTEND_ORIGIN` (backend CORS → frontend) | Render | **Runtime** | Changing it just needs a **restart**, no rebuild |

Because the frontend bakes the backend URL at build time, you should know the backend URL **before** building the frontend. That dictates the deploy order:

> **Supabase → Backend (Render) → Frontend (Vercel) → wire `FRONTEND_ORIGIN` → OAuth redirect URLs → smoke test.**

> 🔒 **Secrets are never committed.** `.env*` is gitignored (only `.env.example` is tracked). All real values go into the **Render** and **Vercel** dashboards.

---

## Step 0 — Supabase (production project)

1. Confirm your production Supabase project (or create one).
2. Apply the schema. Run **all** the migrations under `supabase/migrations/` **in order** against the prod database. The current set is **`001`–`026`** (the later ones add Google-only auth, online-only location, lesson calendar/file links, the find-tutor quick wizard, the admin teacher-approval flow in `023_teacher_approval_status.sql`, and the **multi-account schema in `024`–`026`** — the `accounts` table + `account_id` backfill, required for one identity to own multiple role accounts). Then run the hard gate locally:
   ```bash
   npm run db:validate
   ```
   This asserts exact migration order, every table + RLS enablement, enum names/values, the Auth FK link, and that no RLS policy is unrestricted or granted to `anon`. **Do not deploy on a failing `db:validate`.**

   > Note: `supabase/admin/promote-admin.sql` is **not** a migration — it lives outside `supabase/migrations/` on purpose and is run by hand later (Step 6).
3. From **Project Settings → API**, copy:
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_ANON_KEY` (anon / public key)
   - `SUPABASE_SERVICE_ROLE_KEY` (service role — backend only, never exposed to the browser)
4. From **Project Settings → Database → Connection string**, copy a connection string for `DATABASE_URL`. For a long‑running server, use the **Session pooler** (port `5432`) or the **direct** connection — **not** the per‑request transaction pooler. Include `?sslmode=require` if your client needs it.

---

## Step 1 — Backend on Render

Create a new **Web Service** from this repo.

| Setting | Value |
| --- | --- |
| Root directory | repo root (this is an npm‑workspaces monorepo) |
| Runtime | Node (≥ 20) |
| Build command | `npm ci && npm run build --workspace @studybuddy/backend` |
| Start command | `node apps/backend/dist/server.js` |

The backend `build` runs `tsc -p tsconfig.json`, emitting compiled ESM to `apps/backend/dist/`; `dist/server.js` is the entrypoint.

### Environment variables (Render dashboard)

| Variable | Value | Notes |
| --- | --- | --- |
| `NODE_ENV` | `production` | Hard‑gates `DEV_AUTH_BYPASS` off (`env.ts`) |
| `HOST` | `0.0.0.0` | **Critical.** The app defaults to `127.0.0.1`, which won't accept external traffic — Render returns 502 without this |
| `PORT` | *(leave unset)* | Render injects a `PORT`; the app reads it automatically |
| `FRONTEND_ORIGIN` | placeholder for now | Set the real Vercel URL in Step 3 |
| `SUPABASE_URL` | from Step 0 | |
| `SUPABASE_ANON_KEY` | from Step 0 | |
| `SUPABASE_SERVICE_ROLE_KEY` | from Step 0 | |
| `DATABASE_URL` | from Step 0 | Session pooler / direct connection |
| `ADMIN_GOOGLE_EMAIL` | the admin's Google email | Identifies the single admin account for the `scripts/bootstrap-admin.mjs` promotion (Step 6). Not a login secret — the admin still signs in with Google. |
| `ENABLE_MULTI_ACCOUNT` | *(leave unset)* | Multi-account is **on by default** (opt-out: set to `false` to disable). Controls whether `POST /api/accounts` can create a second role account for an identity. |

> The frontend sends a custom **`X-Account-Id`** request header to select the active account; it is already in the backend CORS `allowedHeaders` (`app.ts`). If you ever fork the CORS config, keep that header — without it the browser preflight blocks every authenticated request.

If you use the Google Calendar integration, also set:

| Variable | Value |
| --- | --- |
| `GOOGLE_CLIENT_ID` | from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | from Google Cloud Console |
| `GOOGLE_CALENDAR_REDIRECT_URI` | your prod backend callback URL, e.g. `https://studybuddy-api.onrender.com/api/teachers/me/calendar/callback` |
| `CALENDAR_TOKEN_ENCRYPTION_KEY` | base64 key used to encrypt stored calendar tokens |

> ❌ **Never set in production:** `ENABLE_ADMIN_QA_MODE`, `DEV_AUTH_BYPASS`. (`DEV_AUTH_BYPASS` is double‑gated off whenever `NODE_ENV=production`, but leave it unset anyway.) Also leave **all the QA/staging‑only bootstrap vars unset**: `ADMIN_BOOTSTRAP_PASSWORD`, `TEST_USERS_BOOTSTRAP_PASSWORD`, `TEACHER_BOOTSTRAP_PASSWORD`, `PARENT_BOOTSTRAP_PASSWORD`, and `CONFIRM_REMOTE_DEVELOPMENT_USER_RESET`.

### Notes

- Render's **free tier spins down** after inactivity, so the first request after idle is slow (cold start). Use a paid instance for a real production site, or accept the latency.
- Deploy, then record the backend URL (e.g. `https://studybuddy-api.onrender.com`).
- Verify it's live: open `https://<your-backend>/health` — it should return OK.

---

## Step 2 — Frontend on Vercel

Import the repo as a new Vercel project.

- **Root directory:** repo root. The root `vercel.json` already drives the build — no framework overrides needed:
  ```json
  {
    "buildCommand": "npm run build --workspace @studybuddy/frontend",
    "installCommand": "npm ci",
    "outputDirectory": "apps/frontend/dist",
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```
  (The SPA `rewrites` ensure deep links like `/teacher/dashboard` serve the app instead of 404ing.)

### Environment variables (Vercel → Production scope)

| Variable | Value |
| --- | --- |
| `VITE_API_BASE_URL` | the Render backend URL from Step 1 |
| `VITE_SUPABASE_URL` | same as `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | same anon key |

> ❌ **Never set in production:** `VITE_ENABLE_ADMIN_QA_MODE`, `VITE_ENABLE_DEMO_SEED`, and any `VITE_DEMO_*` variables. Those are staging‑only.

Deploy, then record the Vercel production URL (e.g. `https://studybuddy.vercel.app`).

---

## Step 3 — Wire the two together

1. On **Render**, set `FRONTEND_ORIGIN` to the exact Vercel production URL (e.g. `https://studybuddy.vercel.app`) and restart the service. The backend builds its CORS allowlist from this value and auto‑adds the `localhost` ↔ `127.0.0.1` mirror. If you have more than one frontend domain (e.g. a custom domain), provide a **comma‑separated** list.
2. If you set `VITE_API_BASE_URL` to a placeholder earlier, update it on **Vercel** now and **redeploy** (it's baked at build time).

---

## Step 4 — Auth / OAuth redirect URLs

1. **Supabase → Authentication → URL Configuration:** set **Site URL** to the Vercel domain and add it to the **Redirect URLs** allowlist.
2. **Google Cloud Console → OAuth client:** add the prod **Authorized JavaScript origins** (the Vercel domain) and the **Authorized redirect URIs** (the Supabase auth callback and your backend `GOOGLE_CALENDAR_REDIRECT_URI`).
3. **Supabase → Authentication → Providers → Google:** ensure the client ID/secret match, and that `GOOGLE_CALENDAR_REDIRECT_URI` on Render points at the prod backend.

---

## Step 5 — Production smoke test

- `GET https://<backend>/health` → returns OK.
- Open the Vercel app; **sign in with Google** completes (no redirect/loop errors).
- Open the browser console — **no CORS errors** on `/api/*` calls.
- An authenticated request (e.g. loading the teacher dashboard) returns data, not 401/403.
- Hard‑refresh a deep route (e.g. `/teacher/students`) — the SPA loads, not a 404.

---

## Step 6 — Provision the admin (Control Tower)

The Admin Control Tower is the highest‑privilege surface and has **no self‑registration** — there is no endpoint or code path that grants the `admin` role. A single flat `admin` role is provisioned **by hand**, once, after deploy.

1. Have the admin **sign in with Google once** on the production app. First sign‑in creates their `public.users` row (the promotion below requires the row to already exist).
2. Promote that row to `admin`, either:
   - **SQL (recommended):** edit `supabase/admin/promote-admin.sql`, replace the email literal with the admin's email, and run it in the **Supabase SQL editor** or `psql "$DATABASE_URL" -f supabase/admin/promote-admin.sql`. It's idempotent (re‑running on an already‑admin row is a no‑op).
   - **Script:** with `ADMIN_GOOGLE_EMAIL` set, run `node scripts/bootstrap-admin.mjs`.
3. Verify exactly one row was promoted:
   ```sql
   select id, email, role, status from public.users where email = '<admin-email>';
   ```
4. Sign in as the admin and confirm the Control Tower loads (Overview / Users CRM / Approvals Center).

> This SQL lives **outside** `supabase/migrations/` deliberately — it's a one‑off DBA action, not part of the validated migration sequence, so `db:validate` never touches it.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| CORS error in console on `/api/*` | `FRONTEND_ORIGIN` doesn't match the Vercel URL | Set the exact origin on Render and restart (comma‑separate multiple domains) |
| Frontend calls `localhost:4000` in prod | `VITE_API_BASE_URL` wasn't set at build time | Set it on Vercel and **redeploy** (build‑time bake) |
| Render returns 502 / app unreachable | `HOST` left at default `127.0.0.1`, or wrong start path | Set `HOST=0.0.0.0`; confirm start is `node apps/backend/dist/server.js` |
| Build fails on Render | Missing deps / wrong workspace | Use `npm ci && npm run build --workspace @studybuddy/backend` |
| DB connection errors / exhaustion | Wrong connection string for a long‑running server | Use the Supabase **session pooler / direct** connection for `DATABASE_URL` |
| Sign‑up loops or 500s | Broken OAuth provisioning flow, or `DEV_AUTH_BYPASS` set in prod | Keep `NODE_ENV=production`, never set `DEV_AUTH_BYPASS`; verify Supabase/Google redirect URLs |
| OAuth redirect mismatch error | Prod URLs not registered | Add the Vercel + backend callback URLs in Google Cloud Console and Supabase |
| `db:validate` fails | Migration drift vs the locked schema | Reconcile `supabase/migrations/` before deploying |
| Admin sees no Control Tower / 403 on `/api/admin/*` | Admin role not provisioned | Run Step 6 (`promote-admin.sql`) — and make sure the admin signed in with Google **once** first so their `users` row exists |

---

## Alternative: backend on Railway

Identical to Render:

- **Build:** `npm ci && npm run build --workspace @studybuddy/backend`
- **Start:** `node apps/backend/dist/server.js`
- Set `HOST=0.0.0.0`; Railway injects `PORT` automatically.
- Same env‑var set as Step 1; same `FRONTEND_ORIGIN` wiring in Step 3.

---

## Pre‑deploy sanity check (local)

Before the first real deploy, confirm both workspaces build cleanly:

```bash
npm ci
npm run build        # builds both workspaces
npm run db:validate  # schema gate
```
