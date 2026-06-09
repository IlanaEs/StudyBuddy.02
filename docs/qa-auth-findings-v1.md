# QA Findings — Auth, Onboarding, Routing & Edge Cases (v1)

**Date:** 2026-06-09
**Branch:** feat/teacher-dashboard-unification
**Mode:** First-pass QA (findings only — no fixes applied, per task instructions)

## Method & important caveat

This pass is a **static code audit** of the auth, onboarding, role-routing and
edge-case-UI code paths. The deliverable asks for live results (screenshots,
console/network errors, backend logs). A real logged-out → Google/email signup →
dashboard clickthrough **cannot be executed here** — it needs the dev servers
running plus real Supabase + Google OAuth credentials, plus admin rows seeded via
manual SQL. The clickthrough matrix that still requires a human/live run is listed
in the last section.

Findings below are split into **Verified** (I read the exact source and confirmed
the behavior) and **Reported** (surfaced by code exploration, plausible, but not
line-confirmed by me this pass). Several exploration findings were **dismissed as
false positives** — also listed, so the checked-and-fine areas are explicit.

Severity: **High** = breaks a flow / wrong-role exposure · **Medium** = degraded
UX or recoverable-but-confusing · **Low** = polish / dev-only / theoretical.

---

## Summary table

| # | Finding | Sev | Status | Location |
|---|---------|-----|--------|----------|
| 1 | Wrong-role user silently lands on the public marketing landing page | Medium | ✅ FIXED (2026-06-09) — redirect to own dashboard | `auth/ProtectedRoute.tsx:30-36` |
| 2 | No timeout on auth bootstrap → indefinite loading spinner if backend hangs | Medium | ✅ FIXED (2026-06-09) — 15s timeout + retry UI | `api/client.ts`; `auth/AuthProvider.tsx`; `ProtectedRoute.tsx`; `AuthCallbackRoute.tsx`; `auth/SessionStatusScreens.tsx` |
| 3 | "Reset auth" button wipes ALL localStorage/sessionStorage (dev-only) | Low | ✅ FIXED (2026-06-09) — scoped to app + Supabase keys | `auth/sessionStorageKeys.ts` |
| 4 | Concurrent `resolveSession` calls have no dedup/abort (rapid auth changes) | Low–Med | ✅ FIXED (2026-06-09) — monotonic seq guard, last-call-wins | `auth/AuthProvider.tsx` (`resolveSeqRef`) |
| 5 | `getDashboardPathByRole(null)` returns `/login` (theoretical loop) | Low | Verified | `utils/getDashboardPathByRole.ts:9` |
| 6 | `/dashboard` route has no `allowedRoles` (safe — placeholder bounces by role) | Info | Verified | `app/App.tsx:52-59`; `routes/DashboardPlaceholderRoute.tsx` |
| 7 | Un-provisioned user at `/teacher-onboarding` may hang on draft-loading (403) | High* | ✅ VERIFIED — no load hang; fixed a broken retry button instead | `pages/TeacherOnboardingPage.tsx` |
| 8 | No explicit "onboarding complete" flag for student/parent → wizard re-entry | Medium | Reported | `features/matching/...`, `students.service.ts` |
| 9 | No "one active intake" guard for parents (multiple children/intakes) | Medium | Reported (product) | `studentIntakes.service.ts` |
| 10 | Student dashboard error state has no retry CTA | Medium | ✅ FIXED (2026-06-09) — GlobalStateCard error+retry | `features/studentDashboard/pages/StudentDashboardPage.tsx` |
| 11 | No 403/"locked" UI anywhere (`GlobalStateCard variant="locked"` unused) | Low | Reported | `design-system/...GlobalStateCard` |
| 12 | Parent child-profile FK `on delete restrict` blocks parent deletion | Med | Reported (data) | `supabase/migrations/002...` |
| 13 | Misc empty/loading-state polish (parent "coming soon" calendar btn, etc.) | Low | Reported | see §Edge cases |

\* High **if** confirmed by live test — see §Needs live verification.

---

## Verified findings (read & confirmed against source)

### 1. Wrong-role users silently bounce to the marketing landing page — Medium
`ProtectedRoute.tsx:24-25` redirects a logged-in user whose role isn't allowed to
`"/"`. `App.tsx:40` maps `/` to `MainLandingRoute` — the **public marketing page**,
not the user's own dashboard and not a "permission denied" screen.

Result: a student opening `/teacher/dashboard` lands on the marketing homepage with
no explanation. Not a security hole (backend RLS still enforces data access), but
confusing and reads as "broken". Route guards otherwise correct across all four
roles (`App.tsx:60-188` — every dashboard + admin sub-route carries the right
`allowedRoles`).

**Fix:** redirect wrong-role users to *their own* dashboard
(`getDashboardPathByRole(effectiveRole)`) instead of `/`, or render
`GlobalStateCard variant="locked"` with a "go to your dashboard" CTA.

### 2. No timeout on auth bootstrap → indefinite spinner if backend is slow/down — Medium
`apiRequest` (`api/client.ts:22`) uses bare `fetch` with **no `AbortController`/
timeout**. Auth bootstrap awaits `/api/auth/me` (`AuthProvider.tsx:122`). While that
promise is pending, `status === 'loading'`, so both gates render forever:
- `ProtectedRoute.tsx:16-17` → `"Checking session..."`
- `AuthCallbackRoute.tsx:19-24` → `"מאמת..."`

If the backend hangs (cold start, network stall) the user is stuck with no error
and no retry. This is the most likely real-world cause of the task's
"stuck on loading screen after Google OAuth return".

**Fix:** add a timeout/abort to `apiRequest` (e.g. 15s) and surface a timeout error
state in `AuthProvider`; give `AuthCallbackRoute`/`ProtectedRoute` an error+retry
branch instead of an unbounded spinner.

### 3. "Reset auth" wipes ALL browser storage — Low (dev-only)
`resetBrowserAuthStorage()` (`sessionStorageKeys.ts:38-50`) calls
`localStorage.clear()` + `sessionStorage.clear()` — everything, not just app keys.
The app already maintains a scoped key list (`APP_LOCAL_STORAGE_KEYS` /
`APP_SESSION_STORAGE_KEYS`) used by `clearAppSessionStorage()`.

Mitigating: the button is gated behind `import.meta.env.DEV` (`SessionControls.tsx:102`),
so it **does not ship to production**. The task's "reset auth storage button works"
check therefore applies to dev builds only — worth confirming the team expects no
prod reset button.

**Fix:** scope `resetBrowserAuthStorage` to the known app + Supabase keys (reuse
the scoped lists), or document it as intentionally nuclear-and-dev-only.

### 4. No dedup/abort across concurrent `resolveSession` calls — Low–Medium
`resolveSession` is invoked from bootstrap (`AuthProvider.tsx:213`), every
`onAuthStateChange` event (`:235`, fire-and-forget `void`), and `refreshProfile`
(`:267`). There's an `isMounted` guard but **no request-sequence guard**. Under
rapid auth transitions (sign-in immediately followed by sign-out, or a
refresh-while-resolving) two in-flight `/api/auth/me` calls can resolve out of
order and the **stale one wins**, briefly leaving a mismatched user/profile.

Not observed to break normal flows; relevant to the task's "switching between
accounts does not leak old role/profile state" check.

**Fix:** track a monotonically increasing request id (or `AbortController`) in
`resolveSession`; apply results only from the latest call.

### 5. `getDashboardPathByRole(null)` → `/login` — Low (theoretical)
`getDashboardPathByRole.ts:9` defaults a null/unknown role to `/login`. Its only
caller for redirects (`AuthCallbackRoute.tsx:28`) runs solely when
`status === 'authenticated'`, which guarantees a concrete role — so the loop can't
trigger in practice today. Flagging because the default is a foot-gun if reused
elsewhere.

**Fix:** default to `/` (landing) and log a warning, rather than `/login`.

### 6. `/dashboard` lacks `allowedRoles` — Info (not a bug)
`App.tsx:52-59` wraps `/dashboard` in `ProtectedRoute` with no `allowedRoles`.
That's intentional: `DashboardPlaceholderRoute` immediately `Navigate`s each
authenticated role to its real dashboard, and unauthenticated users are caught by
`ProtectedRoute`. No wrong-role exposure. Leave as-is or add an explicit all-roles
list for clarity.

### ✅ Verified-correct: OAuth provisioning 401 vs 403 contract
`AuthProvider.tsx:124-147` correctly distinguishes a **401** (invalid/stale token →
`clearInvalidSession`, drop to logged-out, reachable login) from a **403** (valid
Supabase session, not yet provisioned in `public.users` — the normal mid-Google-
signup state → keep session, stay unauthenticated, no error surfaced) so
onboarding can call `complete-oauth-signup`. This matches the locked OAuth
provisioning contract. `AuthCallbackRoute.tsx:13-17` also signs out a stale OAuth
session that errored, preventing a refresh loop. Good.

---

## Reported findings (from exploration — verify before fixing)

### 7. Un-provisioned user at `/teacher-onboarding` may hang on draft-loading — High if confirmed
Reported: a Supabase-authenticated-but-un-provisioned user (no role yet) hitting
`/teacher-onboarding` triggers a draft fetch that 403s, leaving `draftLoading`
true with no error branch → indefinite spinner. Same class as finding #2 (no
timeout). **Needs a live repro** (open `/teacher-onboarding` with a fresh Google
session that hasn't completed signup).
**Fix (if real):** add an error/timeout branch to the draft-load effect; redirect
un-provisioned users into the signup step instead of spinning.

### 8. No explicit onboarding-complete flag for student/parent — Medium
Teachers have `onboarding_drafts.onboarding_completed`; students/parents do not —
"completion" is implicit in `student_intakes` creation. A user who creates a
`students` row but abandons before the intake can re-enter `/onboarding/matching`
and the state is restored from localStorage with no clear "resume vs start over".
**Fix:** add a resume/restart prompt, or a derived completion check.

### 9. No "one active intake" guard for parents — Medium (product decision)
Reported: a parent can create multiple children and multiple overlapping intakes
with no backend cap. May be intended (parent serves several kids) — confirm the
product rule, then enforce or document. Tag `[MISSING PRODUCT DECISION]` if unclear.

### 10. Student dashboard error state lacks a retry CTA — Medium
`StudentDashboardPage.tsx:48-51` renders inline error text only, while parent/
teacher/admin dashboards use `GlobalStateCard variant="error"` with a retry button.
**Fix:** swap to `GlobalStateCard variant="error"` + `refetch()`.

### 11. No 403 / "locked" UI is ever rendered — Low
`GlobalStateCard` supports `variant="locked"` but no screen uses it; wrong-role
access just redirects (finding #1). **Fix:** use it for the wrong-role case.

### 12. Child-profile FK `on delete restrict` blocks parent deletion — Medium (data)
Reported: `students.parent_user_id` uses `on delete restrict`, so deleting a parent
with children fails with no in-app recovery path. **Fix:** define the policy
(soft-delete / cascade) and document it.

### 13. Edge-state polish (Low)
Reported, dashboard-level: parent dashboard child-switch has no spinner (opacity
fade only, blank if fetch >200ms); parent "coming soon"/disabled Google-calendar
button reads as unfinished; student empty-overview copy
("עדיין לא מולא שאלון") is misleading when tiles simply have no data; "link
pending" buttons lack loading affordance. Loading/empty states otherwise exist
across dashboards (`GlobalStateCard` + per-tile `EmptyState`/`TileEmpty`). Admin
primary nav matches spec (Overview, Users CRM, Approvals, Matching Insights,
Support & Tickets; Settings/Audit-Log not in primary nav).

---

## Dismissed (checked — NOT issues)

- **"Non-atomic user+profile+status updates after OAuth"** — the four `setState`
  calls in `resolveSession` (`AuthProvider.tsx:149-168`) all run in the same
  post-`await` microtask; **React 19 auto-batches** them into one render, so no
  intermediate `authenticated && user===null` frame exists. Not a bug.
- **"Account switch leaks provider_token"** — the recovery guard
  (`AuthProvider.tsx:115`) requires `parsed.userId === nextSession.user.id`; Supabase
  user IDs are globally-unique UUIDs (no collision), and `clearAppSessionStorage()`
  (called by `logout`) removes `sb_provider_token`. No cross-account leak.
- **"OAuth redirect URL unvalidated"** — redirect uses `window.location.origin`
  (same-origin); Supabase enforces its own redirect allowlist. Low/non-issue.
- **`/api/auth/me` 401 "not awaited"** — it *is* awaited (`AuthProvider.tsx:129`).

---

## Needs live verification (could not run here)

Run `npm run dev` with real Supabase + Google OAuth, plus a manually-seeded admin
row, then walk this matrix and capture console/network/backend logs + screenshots
on failure:

1. **Fresh Google signup** — teacher / student / parent: logged-out → Google →
   correct onboarding → `public.users` + role-profile row created → redirect to
   correct dashboard → logout → re-login returns to correct dashboard.
2. **Fresh email signup** — teacher / student / parent: same as above.
3. **Existing users** — login / logout / re-login / hard refresh / direct dashboard
   URL → always correct dashboard (no cross-role landing).
4. **Route guards** — each wrong-role direct-URL attempt (note finding #1: today
   you'll land on the marketing page, not a 403 screen); logged-out → protected
   route → `/login`.
5. **Session edge cases** — expired/stale token, hard refresh persistence, the
   dev-only reset button, account switching, OAuth-return-not-stuck (finding #2 is
   the main risk here).
6. **Admin** — manual-SQL admin only; confirm public signup offers no admin option
   (verified in code: `authValidation.ts` account-type enum has no `admin`).

## Recommended fix order

1. #2 auth bootstrap timeout + error/retry (covers #7) — removes the worst "stuck"
   failure mode.
2. #1 wrong-role redirect → own dashboard or locked screen (with #11).
3. #10 student error CTA; #4 resolveSession sequencing.
4. #8 / #9 / #12 — confirm product/data decisions, then enforce.
5. #3 / #5 / #13 — polish.
