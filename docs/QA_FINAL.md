# StudyBuddy.02 — Final QA & Demo Notes

**Status: READY FOR FINAL SUBMISSION.**
Production: frontend `https://study-buddy-fawn.vercel.app` · backend `https://studybuddy-02.onrender.com`
(Render free tier — the first request after idle is a ~30–60 s cold start; warm it before a demo).

This document is the final QA record (tested flows), the reproducible end-to-end runbook, the
booking/calendar checklist, the demo preparation guide + script, and the list of frozen modules.

---

## 1. Final tested flows (verified in production)

All flows below were exercised against the live production deployment and **PASS**.

| # | Flow | Result |
|---|---|---|
| 1 | Teacher onboarding (signup → wizard → active profile) | ✅ PASS |
| 2 | Admin approval (teacher approval gate) | ✅ PASS |
| 3 | Student onboarding (intake wizard) | ✅ PASS |
| 4 | Parent onboarding (account + child) | ✅ PASS |
| 5 | **Parent → add Student** account (same email) | ✅ PASS |
| 6 | **Student → add Parent** account (same email) | ✅ PASS |
| 7 | **Teacher + Parent + Student** coexisting on one email | ✅ PASS |
| 8 | Matching (curated, ≤3 ranked results) | ✅ PASS |
| 9 | Booking request (create → teacher approve → lesson) | ✅ PASS |
| 10 | Google Calendar integration | ✅ PASS |
| 11 | Account switching (across all roles) | ✅ PASS |
| 12 | Active-account persistence after refresh | ✅ PASS |

`POST /api/student-intakes` returns **HTTP 200** in all onboarding flows (both add-a-role
directions), and matching returns results after onboarding completes.

**Multi-account note (root cause of the prior 403s, now resolved):** profile resolution is
**role-scoped** — a Student flow resolves the identity's **own** profile (`students.user_id`); a
Parent flow resolves a **child** (`students.parent_user_id`). The intake POSTs under the
role-matching `X-Account-Id`. Cross-role profile reuse is prevented. (Fix: commit `8026a49`; see
`README.md` → Multi-account architecture.)

---

## 2. End-to-end runbook (reproduce a full production flow)

Run in a **fresh incognito window** per role (avoids stale `localStorage` account/draft state).
Auth is **Google-only** — use real Google accounts.

### Teacher
1. Open the production URL → **Sign in with Google**.
2. Complete teacher onboarding: professional status → subjects & levels → availability (manual grid
   or Google Calendar sync) → rate → declarations → submit. Expect an **active teacher profile**.
3. Teacher is **pending admin approval** (not yet matchable).

### Admin
4. Sign in as the admin (see Demo prep → admin access). Open **Approvals Center** and **approve** the
   teacher. The teacher is now matchable.

### Student
5. New incognito → sign in with Google → choose **"I'm the student"**.
6. Complete the intake wizard (subject, level, goal, budget, availability, preferences) → submit.
   Expect `POST /api/student-intakes` → **200** and a redirect to results.
7. **Find Tutor** → expect **Top-3 ranked matches**.
8. Pick a teacher → **send a booking request** → confirmation screen.

### Parent
9. Same email or a new one → sign in → choose **"I'm a parent"** (or, on an existing identity, use
   the **account switcher → Add Parent account**).
10. **Add a child**, then **Find Tutor** for that child → Top-3 matches → booking request.
11. Open the **Parent Dashboard** — child selector, next lesson, latest update + homework, pending
    confirmations, weekly schedule.

### Multi-account checks
12. On one email, create all three (Teacher + Student + Parent), **switch** between them via the
    navbar account switcher, **refresh** mid-session (active account persists), and confirm each
    role's intake/dashboard resolves the correct profile (no cross-role bleed).

---

## 3. Booking & Calendar verification checklist

| Check | Expected |
|---|---|
| Booking request creation | `POST /api/booking-requests` → pending `booking_request` (no lesson yet) |
| Teacher approval | `POST /api/booking-requests/:id/respond` (approve) — **atomic** |
| Lesson creation | A `scheduled` lesson row is created on approval (double-booking prevented) |
| Google Calendar event | Event created on the teacher's calendar on approval (best-effort; non-blocking if the calendar token is absent) |
| Blocking-times sync | Teacher busy times imported from Google Calendar block availability cells in the booking grid |
| Meeting link | Google Meet link (`conferenceData` / `hangoutLink`) generated + stored on the lesson, when calendar is connected |

> The lifecycle is locked: `booking_request (pending) → teacher approve → lesson (scheduled)`. A
> lesson does **not** exist while the request is pending. Live calendar/Meet steps require a real
> Google Calendar token (granted during the calendar-sync OAuth).

---

## 4. Demo preparation

### Demo accounts (real Google accounts — production auth is Google-only)
Create/prepare these before the demo and warm the backend (`GET /health`) first:

| Role | How to set up |
|---|---|
| **Teacher** | Sign in with Google → complete teacher onboarding → have the admin approve it (so matches show). |
| **Student** | Sign in with Google → choose "I'm the student" → complete intake (so Find Tutor works). |
| **Parent** | Sign in with Google → "I'm a parent" → add a child. *(Tip: the multi-account story demos well by creating Student then Parent on the **same** Google email.)* |
| **Admin** | Sign in with Google **once**, then promote that `users` row — see below. |

**Admin access (one-time, manual — no self-registration):** after the admin signs in with Google
once, promote their row in the **Supabase SQL editor** using
[`supabase/admin/promote-admin.sql`](../supabase/admin/promote-admin.sql) (replace the email; it's
idempotent). Because the **active account** governs role, also ensure the admin's default account is
`admin`:
```sql
update public.users set role = 'admin', updated_at = now() where email = '<admin-email>';
update public.accounts a set role = 'admin', updated_at = now()
  from public.users u where a.user_id = u.id and u.email = '<admin-email>' and a.is_default = true;
```
Then sign out/in so `/me` re-resolves the admin account.

**Live production link:** `https://study-buddy-fawn.vercel.app`

### Demo script (3–5 minutes)
1. **(0:00) Framing** — "StudyBuddy is a CRM-driven matchmaking OS for private education — curated
   matching, *not* a marketplace. Hebrew-first / RTL. Four roles: teacher, student, parent, admin."
2. **(0:30) Teacher** — show the onboarding wizard result + that the teacher is gated until **admin
   approval**; approve it in the Admin Control Tower (KPIs + Approvals).
3. **(1:30) Student** — intake wizard → **Find Tutor** → **Top-3 ranked matches** (call out the
   match score) → **send a booking request**.
4. **(2:30) Teacher inbox** — approve the request → it **atomically creates a scheduled lesson** (+
   Google Meet link / calendar event).
5. **(3:15) Multi-account highlight** — on **one Google email**, switch Student → Parent via the
   navbar **account switcher** (no re-login), add a child, open the **Parent Dashboard**. Emphasize:
   one identity, separate role accounts, data fully separated.
6. **(4:15) Close** — parent confirmation + homework on the dashboard; mention backend-enforced
   permissions + the locked booking lifecycle.

---

## 5. Frozen modules (do NOT modify unless a critical bug is found)

The multi-account architecture is **locked for submission**:
`users` · `accounts` · `students` · `student_intakes` · `ensureStudentProfile` · `switchAccount` ·
`X-Account-Id` handling · active-account persistence · the overall multi-account flow.

Invariant to preserve: student/child profiles are resolved by the **active account's role**, never by
a bare identity lookup, and the matching-wizard intake POSTs under the role-matching `X-Account-Id`.
