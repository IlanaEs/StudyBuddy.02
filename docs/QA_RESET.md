# QA Reset — Simulate a Brand-New User with an Existing Google Account

The canonical procedure for re-running **teacher or student onboarding from scratch**
using the *same* Google account, with **no code changes**.

> **Why this doc exists.** A Google identity maps to a *fixed* Supabase `auth.users`
> row, and the app caches onboarding/session state in the browser. If you reset only
> part of this, the same account behaves like a **returning** user, not a fresh one —
> which produces misleading QA results (and was a contributing factor in past
> `401`/`403` onboarding loops, where an orphaned `auth.users` row was left behind).

---

## TL;DR

```bash
# 1. Audit what will be deleted (dry run, no writes)
node scripts/delete-user-account.mjs --email=<google-account-email>

# 2. Delete the account + all its data + the auth.users row
node scripts/delete-user-account.mjs --email=<google-account-email> --confirm

# 3. Re-audit — every table (and auth.users) should report 0
node scripts/delete-user-account.mjs --email=<google-account-email>
```

Then **reset the browser** (DEV reset button / logout / manual clear) and re-run
onboarding. Order is always **Server → Browser → Re-auth**.

---

## Why deleting `auth.users` alone is NOT enough (and is blocked)

From the migrations:

| Edge | ON DELETE | Source |
|------|-----------|--------|
| `auth.users` → `public.users` (`supabase_auth_user_id`) | **CASCADE** | `006_auth_user_link.sql:12` |
| `public.users` → `teacher_profiles.user_id` | **RESTRICT** | `002_core_users_students_teachers.sql:52` |
| `public.users` → `students.user_id` / `students.parent_user_id` | **RESTRICT** | `002_core_users_students_teachers.sql:33-34` |
| `public.users` → `onboarding_drafts.user_id`, `notifications.user_id` | CASCADE | `012_…`, `004_…` |
| `public.users` → most CRM / lessons / bookings / messages / admin_actions | RESTRICT | `003_…`, `004_…`, `014_…` |

Consequences:

- **If the user completed onboarding** (has a `teacher_profiles` or `students` row),
  deleting the `auth.users` row **fails** — `RESTRICT` blocks the cascade. You must
  delete the dependent rows **bottom-up first**, then `auth.users`.
- **You must still delete `auth.users`.** If you delete only the app rows but keep the
  auth row, re-signing in with the same Google account returns the **same** auth user,
  and its leftover `app_metadata.role` silently re-provisions `public.users` → not fresh.
- **A truly fresh user requires the `auth.users` row gone**, so the next Google sign-in
  mints a brand-new auth user with **no role** → `/api/auth/me` → `403 (not-provisioned)`
  → `complete-oauth-signup` assigns the role → fresh onboarding.

The `delete-user-account.mjs` script does all of this correctly.

---

## Phase A — Server reset (DB + auth)

`scripts/delete-user-account.mjs` deletes one account and every row referencing it in
FK-dependency order, then the `auth.users` row. It reads Supabase creds from
`apps/backend/.env` and **refuses to run** if `NODE_ENV` / `APP_ENV` / `STUDYBUDDY_ENV`
(in the shell or the `.env`) signals production.

```bash
# Dry run (default): prints "would delete N" per table — no writes
node scripts/delete-user-account.mjs --email=<google-account-email>

# Review the audit, then confirm:
node scripts/delete-user-account.mjs --email=<google-account-email> --confirm
```

(You may also pass the address via `DELETE_USER_EMAIL=<addr>` instead of `--email=`.)

**Deletion order** (each step scoped to the user / their students / their intakes):

```
homework_tasks → lesson_confirmations → lesson_files → messages → conversations →
reviews → teacher_students → lesson_notes → lessons → booking_requests →
match_results → student_intakes → notifications → admin_actions →
onboarding_drafts → students → teacher_profiles → users → auth.users
```

Notes:
- **Handles orphaned auth users.** Even if no `public.users` row exists (e.g. a prior
  partial delete), the script still finds and removes the `auth.users` row by email.
- **Safe to re-run.** On an already-clean account every line prints `0` /
  `(nothing linked)` / `(no auth user)`.

**Verify clean:** re-run the dry run — all counts should be `0` and `auth.users` should
read `(no auth user)`.

---

## Phase B — Browser reset (the machine you'll re-test in)

A stale Supabase session token + cached onboarding drafts make the browser act like a
returning user. Do **one** of:

1. **DEV reset button (easiest).** In a dev build, the `SessionControls` panel shows a
   DEV-only reset action (`handleResetAuth` → `resetBrowserAuthStorage()` →
   `localStorage.clear()` + `sessionStorage.clear()` + reload). This wipes **everything**,
   including the Supabase `sb-<project-ref>-auth-token`.
2. **App logout.** `auth.logout()` runs `clearAppSessionStorage()` **and** Supabase
   `signOut()` (the latter removes the `sb-<project-ref>-auth-token` session key).
3. **Manual (DevTools console), then hard-reload:**
   ```js
   // App keys
   ['sb_teacher_guest_draft','sb_student_onboarding','sb_student_onboarding_oauth_pending',
    'sb_student_gcal_return','sb_student_gcal_write_lesson','sb_dev_dashboard_seed']
     .forEach(k => localStorage.removeItem(k));
   ['sb_provider_token','sb_gcal_provider_token','sb_gcal_connecting',
    'sb_gcal_return_step','sb_gcal_return_route','sb_admin_qa_role_override']
     .forEach(k => sessionStorage.removeItem(k));
   // Supabase session token (whatever the project ref is)
   Object.keys(localStorage).filter(k => k.includes('auth-token')).forEach(k => localStorage.removeItem(k));
   location.reload();
   ```

> **Gotcha:** `clearAppSessionStorage()` does **not** remove the Supabase
> `sb-…-auth-token` key — only `supabase.auth.signOut()` (or the DEV reset / full clear)
> does. Always pair them. Option 1 or 2 handles this for you.

---

## Phase C — Re-run onboarding fresh

- **Teacher:** open `/teacher-onboarding`.
- **Student / parent:** open `/onboarding/matching`.
- Sign in with the **same** Google account. Expected fresh-user behavior:
  1. Supabase mints a **new** `auth.users` (no role).
  2. `/api/auth/me` returns **`403` once** (not-provisioned) — *not* a 401 loop, *not* a 500.
  3. The post-OAuth handler calls `complete-oauth-signup` → role assigned + `public.users` created.
  4. `/api/auth/me` → **200**; onboarding starts at the **beginning** with no prior draft/profile data.
- The Google OAuth request already uses `prompt: consent` + `access_type: offline`, so
  Google re-prompts. **No Google-account-side reset is needed.**

---

## Ordering rule (do not skip)

**Server (Phase A) before Re-auth (Phase C).** If you clear only the browser but leave
the `auth.users` row, the same Google sign-in returns the existing (returning) user.
Always: **A → B → C**.

---

## Alternatives (not the default for single-account QA)

- **Full local wipe:** `npm run db:reset:local-users` (`scripts/reset-local-users.mjs`)
  deletes **all** users + **all** `auth.users` (local/dev only). Use only when you want a
  blank database, not to reset one tester.
- **Deterministic seed accounts:** `npm run qa:seed-users` (password `QaPass123!`,
  see [QA_USERS.md](./QA_USERS.md)) mint sessions via the admin client and **bypass Google
  entirely** — fast for role/routing checks, but they do **not** exercise the real Google
  consent + provisioning path, so they don't replace this procedure.
