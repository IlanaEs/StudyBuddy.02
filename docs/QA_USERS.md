# QA Users (Local Development)

Deterministic accounts for local QA of onboarding, Google OAuth flow and
role-based routing.

## Auth model

**Google OAuth is the only auth method.** Email+password signup/login has been
removed from the app. Account creation happens exclusively through onboarding
flows (student/parent via `/onboarding/matching`, teacher via `/teacher-onboarding`).

The QA/seed scripts mint sessions directly via the Supabase admin client
(`auth.admin.createUser` + `signInWithPassword`). This is a dev-only fixture
that never goes through the app's auth endpoints.

## Setup

1. Seed the deterministic QA users:

   ```bash
   npm run qa:seed-users
   ```

The seed is idempotent and demo-guarded — it refuses to run against a production
Supabase project.

## Shared password (dev fixture only)

All QA users share the same password for Supabase-level sign-in in scripts:

```
QaPass123!
```

This password is **not** used in the app UI (there is no password form).

## Accounts

| Email | Role |
|-------|------|
| `qa.student.a@studybuddy.local` | student |
| `qa.student.b@studybuddy.local` | student |
| `qa.student.c@studybuddy.local` | student |
| `qa.parent.a@studybuddy.local` | parent |
| `qa.parent.b@studybuddy.local` | parent |
| `qa.parent.c@studybuddy.local` | parent |
| `qa.teacher.a@studybuddy.local` | teacher |
| `qa.teacher.b@studybuddy.local` | teacher |
| `qa.teacher.c@studybuddy.local` | teacher |
| `qa.admin@studybuddy.local` | admin |

## Expected redirect after login

| Role | Destination |
|------|-------------|
| student | `/student/dashboard` |
| parent | `/parent/dashboard` |
| teacher | `/teacher/dashboard` |
| admin | `/admin/dashboard` |

## Notes

- **Production safety**: all seed/bootstrap scripts are demo-guarded and refuse
  to run against a production Supabase project.
- **Teachers**: log in lands on `/teacher/dashboard`. The teacher inbox/lessons
  views require a completed teacher profile — run the teacher onboarding flow (or
  use `npm run db:seed:demo` teachers) for those screens.
- **Parents**: the parent dashboard loads on login; add a child via onboarding
  for populated content.
- **Admin**: the admin account can no longer log in via password through the app.
  Use Google OAuth with the admin's Google email. The admin Google email should be
  configured via `ADMIN_GOOGLE_EMAIL` env var in `apps/backend/.env`.
