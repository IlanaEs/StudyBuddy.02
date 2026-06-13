# Multi-Account / Auth / Calendar — Audit & Regression Test Plan

> Audit date: 2026-06-12 (main @ 3b6a8ce); S1–S4 fixed and verified 2026-06-12/13
> (uncommitted working tree). Related: `agents/Permissions Source of Truth.md`,
> migrations `024–026` (applied manually — see deploy notes), Phase 0 of the
> multi-account initiative (PR #62).
>
> **Backend auth/account verification was intentionally NOT changed in this
> round** — `verifyAccessToken`, account ownership 403s, and role mirroring were
> audited as correct and remain covered by the existing backend tests.

## 1. Test framework & commands

- **Vitest** everywhere. Backend: `apps/backend/tests/**/*.test.ts` (node env,
  supertest for HTTP-level tests, `vi.mock` for repository/Supabase isolation).
  Frontend: `apps/frontend/src/**/*.test.ts` (node env, `vi.stubGlobal('fetch')`).
- Commands (repo root):
  - `npm run test` — all workspaces
  - `npm test --workspace @studybuddy/backend -- tests/verifyAccessToken.test.ts`
  - `npm test --workspace @studybuddy/frontend -- src/api/calendarAccountHeader.test.ts`
  - `npm run typecheck` (== `npm run lint`)

## 2. Current behavior map

### Backend (believed correct — covered by existing tests)

| Piece | Behavior | Where |
|---|---|---|
| Account resolution | `verifyAccessToken(token, requestedAccountId)` — with `X-Account-Id`: must belong to the identity and be active, else **403** (never silent fallback). Without it: the **default** account. Self-heals account-less identities via `ensureDefaultAccount`. | `apps/backend/src/auth/authService.ts:57-79` |
| Role mirroring | `request.auth.user.role` is **overwritten with the ACTIVE account's role**; `user.id` stays the identity id. All `requireRole`/`requireAnyRole` guards branch on the active account. | `authService.ts:84-96`, `middleware/authMiddleware.ts:19-36` |
| Header intake | `requireAuth` reads `X-Account-Id` per request. | `authMiddleware.ts:48` |
| `/api/auth/me` | Returns `{ user, profile, accounts, activeAccount }` (additive). | `auth/authController.ts:29-39` |
| Signup idempotency | `completeOAuthSignup` for an existing identity returns `{ user, isNewUser: false }` — no re-provisioning, no error. | `authService.ts:141-188` |
| Account creation | `POST /api/accounts` — gated by `ENABLE_MULTI_ACCOUNT`, creatable roles `teacher\|student\|parent`, teacher gets an onboarding draft. | `accounts/accounts.service.ts` |
| Calendar guards | `/api/teachers/me/calendar/*` → `requireRole('teacher')` (`teachers/teacherRoutes.ts:23`); `/api/student-availability/from-calendar` → `requireAnyRole(['student','parent'])` (`studentAvailability.routes.ts:11`); `/api/lessons/:id/calendar-event` → `requireAnyRole(['student','parent'])` (`lessons.routes.ts:56`). |

Existing backend coverage: `tests/verifyAccessToken.test.ts` (X-Account-Id selection,
role mirroring, foreign-account 403, self-heal), `tests/accounts.test.ts` (service
gating), `tests/oauthSignup.test.ts`, `tests/authMiddleware.test.ts`.

### Frontend

| Piece | Behavior | Where |
|---|---|---|
| Header store | Module variable `_activeAccountId` → injected by `apiRequest` as `X-Account-Id`. **Starts EMPTY on every page load by design** (not seeded from localStorage) so a stale id can't 403 the bootstrap `/me`. | `auth/activeAccount.ts`, `api/client.ts:54` |
| Persistence | `setActiveAccountId` writes `sb_active_account_id` to localStorage; since the S2 fix, `AuthProvider` reads it back after the bootstrap `/me` via `resolveRestorableAccountId` (validated against the server-fresh accounts list) and re-resolves once with the header pinned. | `activeAccount.ts`, `AuthProvider.tsx` |
| Session resolve | `AuthProvider.resolveSession` calls `/me` (default account), restores the validated stored choice if it differs (S2), then pins the final active account id — store and state stay consistent. | `AuthProvider.tsx` |
| Account picker | Netflix-style `/select-account`; gated by `needsAccountSelection` (＞1 account AND sessionStorage flag unset). Enforced **only** at `AuthCallbackRoute`, deliberately not in `ProtectedRoute`. | `AccountSelectionPage.tsx`, `AuthCallbackRoute.tsx:27-30` |
| Role routing | `ProtectedRoute` with `allowedRoles`: on mismatch, auto-switches to an owned ACTIVE account of an allowed role (S3); only when none fits does it redirect to the active role's own dashboard. Never triggers the picker. | `ProtectedRoute.tsx` |
| Add-account paths | (a) `AccountSwitcher.handleCreate` → `createAccount` + `switchAccount` + route to onboarding; (b) student-wizard OAuth return `handlePostOAuthReturn` → on `isNewUser=false` + role mismatch, `createAccount` + `switchAccount` and continue onboarding (commit 3a177a4); (c) wizard Continue while authenticated → `ensureAccountForRole` (S4). | `AccountSwitcher.tsx`, `MatchingWizardPage.tsx` |
| Calendar APIs | `studentCalendar.ts` / `teacherCalendar.ts` use raw `fetch` (bypassing `client.ts` for error-semantics reasons) and since the S1 fix spread `getActiveAccountHeader()` into every request. | both files, all functions |
| Calendar OAuth | Scoped `signInWithOAuth` re-auth → **full-page redirect** out and back; provider token cached per-user-id in sessionStorage (`PROVIDER_TOKEN_KEY`), never localStorage / DB. | `studentCalendar.ts:74-146`, `teacherCalendar.ts:39-56`, `AuthProvider.tsx:164-175,309-314` |

## 3. Broken scenarios (root-cause list)

**S1 — Calendar API calls never send `X-Account-Id`. ✅ FIXED 2026-06-12.**
All functions in `apps/frontend/src/api/studentCalendar.ts` and
`apps/frontend/src/api/teacherCalendar.ts` used raw `fetch` without
`getActiveAccountHeader()`. For a multi-account identity the backend therefore
resolved the **default** account (typically teacher) → student calendar endpoints
(`from-calendar`, `lessons/:id/calendar-event`) returned **403** even though the
user was acting as a student. Fix: every calendar fetch now spreads
`getActiveAccountHeader()` into its headers (same mechanism as `client.ts`);
guarded by 6 permanent tests in `calendarAccountHeader.test.ts`. Note: the wizard
GCal sync can still land on the wrong account because of **S2** (OAuth return
resets the active account) — S1 only guarantees the header matches the active
account.

**S2 — Any full page load resets the active account to the default (incl. Google
Calendar OAuth return). ✅ FIXED 2026-06-12.**
The header store intentionally starts empty, and the stored
`sb_active_account_id` was **never consumed**: the bootstrap `/me` carried no
`X-Account-Id` → backend returned the default (teacher) account → `AuthProvider`
pinned it and **overwrote** the persisted choice. The calendar OAuth flows are
full-page redirects, so connecting Google Calendar as a student/parent silently
flipped the session back to teacher; a plain F5 did the same. Fix:
`resolveRestorableAccountId` (`auth/activeAccount.ts`) — after the bootstrap
`/me`, AuthProvider restores the stored choice **only if** it differs from the
resolved default and is still one of the identity's active accounts per the
server-fresh list, then re-resolves `/me` once with the header pinned. A
stale/foreign/inactive stored id fails validation and is never sent — the
bootstrap's 401/403 contract is untouched and no logout loop is possible. A
transient failure of the restore round-trip keeps the default-account response
so login still succeeds. Guarded by `auth/activeAccount.test.ts` (7 tests).

**S3 — `/student/dashboard` and `/parent/dashboard` don't auto-select an owned
account of that role. ✅ FIXED 2026-06-12.**
`ProtectedRoute` only compared `effectiveRole` to `allowedRoles` and redirected to
the *active* role's dashboard. If the identity owned a student account but the
active account was teacher, navigating to `/student/dashboard` bounced to the
**teacher dashboard**. Combined S2+S3 was the reported "redirected to the wrong
dashboard, usually teacher". Fix: `findAutoSelectAccount`
(`auth/activeAccount.ts`) — on a role mismatch, `ProtectedRoute` switches to an
owned ACTIVE account of an allowed role (allowedRoles order wins) via
`switchAccount`, showing a brief loading state; the optimistic role update lets
the route render immediately while `/me` confirms. One-shot per target id, so a
failed switch falls back to the previous redirect (no retry loop). Skipped under
an admin QA role override (QA wins `effectiveRole`; switching the real account
would fight it). No owned account of the allowed role → old redirect behavior
unchanged. Guarded by 8 `findAutoSelectAccount` tests in
`auth/activeAccount.test.ts`.

**S4 — An already-authenticated teacher is dead-ended in the student/parent
wizard. ✅ FIXED 2026-06-12.**
`hasRoleConflict` (`MatchingWizardPage.tsx`) compared the **active** role to the
chosen track and showed "החשבון המחובר לא מתאים למסלול שנבחר" with no path forward
(plus a broken `navigate('/teacher')` escape button). The create-and-switch path
existed only on the *OAuth-pending return* (`handlePostOAuthReturn`) and in the
`AccountSwitcher`. Fix: new shared helper `ensureAccountForRole`
(`auth/ensureAccountForRole.ts`) — active role matches → no-op; owned ACTIVE
account of the target role → `switchAccount`; otherwise `createAccount`
(idempotent on `(user, role)`) → `switchAccount`. Wired into the wizard's
`handleAuthenticatedContinue` BEFORE the `studentId` early-advance, so subsequent
requests carry the right `X-Account-Id`. The conflict banner is now informational
("Continue enters/creates your separate student/parent account"; logout kept as
secondary), and the restore effect returns silently on conflict — account
creation happens ONLY on the explicit Continue click, never passively from a
restored draft. The OAuth-pending path and AccountSwitcher are unchanged.
Guarded by 8 tests in `auth/ensureAccountForRole.test.ts`.

**S5 — (= S1 surfaced) student onboarding calendar sync 403s for teacher-default
identities. ✅ RESOLVED via S1 + S2 (no separate fix).** During the wizard's GCal
step, the OAuth return (S2) made `/me` resolve teacher, then `from-calendar`
(S1, no header) hit the `student|parent` guard → 403. With S2 the OAuth return
restores the student account and with S1 the request carries its id — the
combined flow needs the live-browser pass (checklist items 6–8) to be declared
fully closed.

**Verified working (for contrast):** backend account selection + 403 on foreign
account; `POST /api/accounts` idempotent creation; `client.ts` header injection;
the OAuth-pending add-account path in the wizard; account picker on multi-account
login via `/auth/callback`.

## 4. Regression tests & checklist

### Added now (automated)

`apps/frontend/src/api/calendarAccountHeader.test.ts` — 8 permanent regression
tests (2 `client.ts` guards + 6 calendar; all pass; the former `it.fails`
markers were removed with the S1 fix):

- `apiRequest` includes / omits `X-Account-Id` per the store (client.ts guard).
- `syncStudentCalendarAvailability`, `addLessonToGoogleCalendar` (student) and
  `syncCalendar`, `fetchCalendarStatus`, `disconnectCalendar`, `fetchBusySlots`
  (teacher) send `X-Account-Id` when an active account exists.

Student↔parent combinations are explicitly covered (added in the verification
pass): `findAutoSelectAccount` selects parent for an active student and student
for an active parent (`activeAccount.test.ts`); `ensureAccountForRole` creates
ONLY the target role from a student/parent active account and switches without
creating when both are owned (`ensureAccountForRole.test.ts`).

### To add alongside the fixes (per scenario)

| # | Scenario | Suggested test |
|---|---|---|
| S2 | OAuth return / reload keeps the active account | ✅ Done: `auth/activeAccount.test.ts` unit-tests `resolveRestorableAccountId` (restore on owned+active mismatch; null for stored=active / foreign / inactive / unprovisioned / empty list — i.e. the no-403, no-loop guarantees). |
| S3 | Dashboard auto-select | ✅ Done: `auth/activeAccount.test.ts` unit-tests `findAutoSelectAccount` (student/parent selection, no-restriction, already-allowed, not-owned → redirect stands, non-active skipped, allowedRoles-order preference). Route-level test still possible later if a testing-library setup is added. |
| S4 | Authenticated teacher adds student/parent via wizard | ✅ Done: `auth/ensureAccountForRole.test.ts` unit-tests the decision (no-op when active matches; switch-not-create when owned; create+switch when missing — student and parent; blocked accounts not reused; createAccount failure → error, no switch; missing token → error; switchAccount rejection → `ok:false`, never throws). |
| S1 | Calendar header | Already pinned (above). |

### Manual QA checklist (until the flows are integration-testable)

Precondition: one Gmail (`i26082001@gmail.com`-style QA identity) owning a
**teacher (default) + student + parent** account; `ENABLE_MULTI_ACCOUNT` /
`VITE_ENABLE_MULTI_ACCOUNT` on.

1. **Teacher Gmail → student signup (wizard + Google button):** open
   `/onboarding/matching` logged out, pick תלמיד, complete Google OAuth with the
   teacher Gmail ⇒ wizard **continues** as the new/owned student account; no
   redirect to `/teacher/dashboard`. *(Works via OAuth-pending path; re-verify.)*
2. **Teacher Gmail → student/parent while already logged in:** logged in as
   teacher, open `/onboarding/matching`, pick the track ⇒ informational banner
   at the auth step; clicking המשך enters (or creates once, then enters) the
   student/parent account and the wizard continues — no dead-end, no redirect to
   the teacher dashboard. (**S4 — fixed**; re-verify live, including that a
   second Continue click after a transient failure doesn't create a duplicate —
   the backend create is idempotent on `(user, role)`.)
3. **Teacher Gmail → parent account via switcher:** AccountSwitcher → הוספת חשבון →
   הורה ⇒ lands in parent onboarding as the parent account; switcher shows 3
   accounts.
4. **`/student/dashboard` auto-select:** active account = teacher, navigate to
   `/student/dashboard` ⇒ enters the owned student account's dashboard (brief
   "Switching account..." state). (**S3 — fixed**; re-verify live.)
5. **`/parent/dashboard` auto-select:** same with the parent account
   (**S3 — fixed**; re-verify live.)
6. **Calendar carries the account:** acting as student, run the GCal sync in the
   wizard ⇒ network tab shows `X-Account-Id: <student account id>` on
   `/api/student-availability/from-calendar`, response 200. (**S1 — fixed**;
   guarded by `calendarAccountHeader.test.ts`. Caveat: until S2 is fixed, the
   OAuth redirect itself may have already reset the active account to teacher —
   then the header correctly carries the *teacher* id and the endpoint still
   403s. That residual failure belongs to S2, not S1.)
7. **GCal OAuth return keeps the role:** acting as student, connect Google
   Calendar (full-page redirect) ⇒ on return, still the **student** account
   (switcher label, `X-Account-Id` on subsequent calls). (**S2 — fixed**;
   re-verify live, this is the flow the fix targets.)
8. **Plain refresh keeps the role:** acting as student, hit F5 ⇒ still student
   (**S2 — fixed**; re-verify live.)
9. **No regression for single-account users:** a single-account teacher logs in ⇒
   straight to teacher dashboard, no picker, calendar sync works (no header needed).
10. **Security guard intact:** hand-crafting a foreign `X-Account-Id` still 403s
    (covered by `verifyAccessToken.test.ts`).
11. **Student → parent dashboard:** active account = student (owns both), navigate
    to `/parent/dashboard` ⇒ auto-switches to the parent account; no redirect to
    `/student/dashboard`, no new account created.
12. **Parent → student dashboard:** active account = parent (owns both), navigate
    to `/student/dashboard` ⇒ auto-switches to the student account; no redirect
    to `/parent/dashboard`, no new account created.
13. **Student → parent wizard:** logged in as student, open `/onboarding/matching`,
    pick the parent track, fill child name, המשך ⇒ switches to (or creates once)
    the parent account and continues; no second student account.
14. **Parent → student wizard:** logged in as parent, pick the student track, המשך
    ⇒ switches to (or creates once) the student account and continues; no second
    parent account.
15. **`ENABLE_MULTI_ACCOUNT=false` staging caveat:** with the backend flag off,
    the wizard's Continue under a role conflict surfaces the backend 403 as a
    visible Hebrew error at the auth step (previously a generic terminal
    conflict). Expected — confirm the message renders rather than a silent stall.
16. **Real-browser OAuth round-trip:** the unit tests cover the decision logic
    only; the actual Google redirect → return → session restore chain (items
    1, 6–8) must be verified in a live browser before this plan is closed.

## 5. Constraints for the fix tasks (binding)

- No auth-architecture rewrite; keep `verifyAccessToken`'s "explicit id or default,
  never silent fallback" contract.
- Keep legacy `users.role` (identity default) — backend mirrors the active
  account's role onto it per-request.
- Provider (Google) tokens stay out of localStorage and plaintext DB fields
  (current sessionStorage-per-user-id cache is the accepted pattern).
- When restoring a stored account id on bootstrap (S2 fix), a stale/foreign id
  must degrade to the default account, **not** loop into the 403→logout path —
  see the OAuth provisioning contract (401 vs 403 semantics) before touching
  `resolveSession`.
