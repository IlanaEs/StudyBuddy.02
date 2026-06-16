# StudyBuddy

**A CRM-driven matchmaking platform for private education.**

StudyBuddy connects students and parents with the right teachers through a curated, intelligent
matching flow — then runs the entire learning relationship, from the first booking through every
lesson. It's built around quality matches over endless browsing: a focused shortlist, not a
marketplace. Hebrew-first and fully RTL.

🔗 **Live demo:** https://study-buddy-fawn.vercel.app
💻 **Repository:** https://github.com/IlanaEs/StudyBuddy.02

---

## Overview

StudyBuddy is an operating system for private tutoring. Teachers build a verified profile and manage
their teaching business; students and parents describe what they need and receive a curated set of
best-fit teachers; and every match flows into a managed lifecycle of booking requests, scheduled
lessons, post-lesson summaries, homework, and parent oversight. One platform covers discovery,
scheduling, delivery, and follow-up.

## Roles

- **Teacher** — builds a profile, sets availability, manages students and lessons.
- **Student** — finds a tutor, books lessons, tracks progress.
- **Parent** — manages a child's learning, books on their behalf, follows lessons and homework.
- **Admin** — oversees the platform and approves teachers through a control center.

## Main features

- **Curated matching** — a smart engine that returns a focused, ranked shortlist of best-fit teachers.
- **Verified teachers** — onboarding plus an admin approval step before a teacher becomes matchable.
- **Booking & lessons** — request → approval → scheduled lesson, with notes, homework, and parent
  confirmation.
- **Google Calendar integration** — calendar sync, availability blocking, and automatic meeting links.
- **Multi-account support** — one login can hold separate Teacher, Student, and Parent accounts.
- **Role-based dashboards** — a tailored portal and navigation for each role.
- **Bilingual, RTL-first design** — a clean, modern Hebrew interface with supporting English labels.

## Portals

### Teacher portal
A dashboard to manage the teaching business: students, lessons, availability, and incoming booking
requests, with onboarding that captures subjects, levels, teaching style, pricing, and verification.

### Student portal
A guided intake that captures goals, subject, level, budget, and availability, leading to curated
matches, booking, and a personal dashboard of upcoming and past lessons.

### Parent portal
A family-oriented dashboard to manage children, find tutors on their behalf, follow each child's
upcoming lessons and homework, and approve lesson confirmations.

## Multi-account support

A single sign-in (one identity) can own **multiple separate accounts** — Teacher, Student, and Parent
— under the same email. Each account has its own role, onboarding, dashboard, and data; the only
shared element is the login identity. Users switch roles in-app instantly, with no second login, and
their active context is remembered across sessions. Data stays cleanly separated per role.

## Matching engine

The heart of the platform. Rather than an open marketplace, StudyBuddy runs a rule-based engine that
ranks teachers across multiple signals — subject and level fit, schedule overlap, location, budget,
experience, and reputation — and returns the **top three** best-fit teachers. A transparent match
score accompanies each result, and a tiered fallback widens the search gracefully when an exact match
isn't available, so students always get meaningful options.

## Lesson workflow

1. **Request** — a student or parent picks a teacher and time and sends a booking request.
2. **Approval** — the teacher reviews and approves the request, which creates a scheduled lesson with
   a meeting link.
3. **Lesson** — the lesson runs; the teacher records a shared summary and homework afterward.
4. **Follow-up** — students and parents see the summary and homework, and parents confirm the lesson.

## Application routes

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

## Technology stack

- **Frontend:** React, TypeScript, Vite, Mantine + Tailwind, Zustand, Framer Motion (Hebrew / RTL).
- **Backend:** Node.js, Express, TypeScript — a clean, layered REST API.
- **Database & Auth:** Supabase (PostgreSQL + authentication) with Google sign-in.
- **Integrations:** Google Calendar & Google Meet.
- **Deployment:** Vercel (frontend) · Render (backend) · Supabase (data & auth).

## Technical overview

StudyBuddy is a TypeScript application with a clean separation of concerns:

- **Frontend** — a **React + TypeScript** single-page app (Vite), Hebrew-first and RTL, with
  role-based dashboards and a guided onboarding & matching experience.
- **Backend** — an **Express** REST API organized in layered domains (routing → controller →
  service → data access), with all permissions enforced server-side.
- **Data & authentication** — **Supabase** provides **PostgreSQL** and authentication, with
  **Google OAuth** as the sign-in method.
- **Google Calendar integration** — teacher availability syncs with Google Calendar, busy times
  block scheduling, and approved lessons generate calendar events with meeting links.
- **Multi-account architecture** — one authenticated identity can own separate Teacher, Student, and
  Parent accounts, switchable in-app with the active context preserved across sessions and data kept
  cleanly separated per role.
- **Deployment split** — the **frontend runs on Vercel**, the **backend on Render**, and **data &
  auth on Supabase**.

## Quality & testing

- **Backend:** 287 automated tests passing.
- **Frontend:** 52 automated tests passing.
- **Production flows manually verified** end-to-end across all roles — onboarding, matching, booking,
  lessons, and multi-account switching.

---

StudyBuddy is a production-ready platform, deployed and live, delivering the full journey from
discovery to lesson delivery for teachers, students, and parents.
