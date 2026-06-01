# QA Users (Local Development)

Deterministic accounts for local QA of onboarding, signup, login and role-based
routing — **without** depending on Supabase email delivery.

## Setup

1. In `apps/backend/.env` set the local signup bypass (auto-confirms new signups,
   no email sent). This is hard-gated and ignored unless `NODE_ENV !== production`:

   ```bash
   DEV_AUTH_BYPASS=true
   ```

2. Seed the deterministic QA users (auto-confirmed, ready to log in):

   ```bash
   npm run qa:seed-users
   ```

The seed is idempotent (re-running resets passwords + roles) and demo-guarded —
it refuses to run against a production Supabase project.

## Shared password

All QA users share the same password:

```
QaPass123!
```

## Accounts

| Email | Password | Role |
|-------|----------|------|
| `qa.student.a@studybuddy.local` | `QaPass123!` | student |
| `qa.student.b@studybuddy.local` | `QaPass123!` | student |
| `qa.student.c@studybuddy.local` | `QaPass123!` | student |
| `qa.parent.a@studybuddy.local` | `QaPass123!` | parent |
| `qa.parent.b@studybuddy.local` | `QaPass123!` | parent |
| `qa.parent.c@studybuddy.local` | `QaPass123!` | parent |
| `qa.teacher.a@studybuddy.local` | `QaPass123!` | teacher |
| `qa.teacher.b@studybuddy.local` | `QaPass123!` | teacher |
| `qa.teacher.c@studybuddy.local` | `QaPass123!` | teacher |
| `qa.admin@studybuddy.local` | `QaPass123!` | admin |

## Expected redirect after login

| Role | Destination |
|------|-------------|
| student | `/student/dashboard` |
| parent | `/parent/dashboard` |
| teacher | `/teacher/dashboard` |
| admin | `/admin/dashboard` |

## Notes

- **Signup bypass** (`DEV_AUTH_BYPASS=true`): when set in a non-production
  environment, `POST /api/auth/signup` creates an already-confirmed user via the
  Supabase admin API and mints a session via password sign-in — so the signup UI
  works end-to-end with no confirmation email. Duplicate emails return a clean
  Hebrew error.
- **Production safety**: `DEV_AUTH_BYPASS` is ignored when `NODE_ENV=production`,
  so production signups keep the standard email-confirmation flow unchanged.
- **Teachers**: log in lands on `/teacher/dashboard`. The teacher inbox/lessons
  views require a completed teacher profile — run the teacher onboarding flow (or
  use the existing `npm run db:seed:demo` teachers) for those screens.
- **Parents**: the parent dashboard loads on login; add a child via onboarding
  for populated content.
