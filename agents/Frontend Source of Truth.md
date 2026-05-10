# StudyBuddy.02 — Frontend Source of Truth

## 0. Purpose

This document defines the frontend source of truth for StudyBuddy.02.

The frontend must translate the product logic, role model, database schema, and naming conventions into a clean, consistent, role-based user experience.

This document is binding for:
- Frontend routes
- Page structure
- Component naming
- State naming
- API response handling
- Role-based navigation
- UI behavior
- Empty/loading/error states
- Data mapping from backend to UI

Frontend must not invent product logic, statuses, roles, or entity names.

---

## 1. Product Frontend Principle

StudyBuddy.02 is not a teacher directory.

It is a matchmaking + CRM platform that replaces manual searching, WhatsApp coordination, and scattered lesson management with a clean operational system.

Frontend must support three core promises:

1. Student/parent gets only 3 relevant teacher matches.
2. Teacher manages lessons, students, availability, and communication from one CRM.
3. The system feels fast, clean, and operational — not like a marketplace feed.

---

## 2. Core UX Rule

The frontend should reduce choice, not increase it.

Forbidden UX patterns:
- Infinite teacher browsing
- Large marketplace grids
- Random teacher discovery
- Unclear next action
- Multiple competing CTAs
- WhatsApp-first flows
- Payment/salika assumptions in MVP

Required UX patterns:
- Clear primary action per screen
- Bento-style dashboards
- Role-based navigation
- 3-match result experience
- Fast booking flow
- Email-first notifications
- CRM-first teacher workflow

---

## 3. Frontend Tech Stack

Recommended stack:

- React
- Vite
- TypeScript
- Tailwind CSS
- Zustand for global UI/auth state
- Supabase Auth on frontend
- REST API backend integration
- React Router or framework router depending on repo setup

Frontend must keep:
- UI logic in components
- API calls in service/client layer
- Shared types in `/types`
- Role routing in dedicated guards
- No hardcoded fake business rules inside components

---

## 4. Naming Rules

Frontend naming follows the Sacred Names Convention.

### State

Use `camelCase` only.

Examples:
- `currentUser`
- `selectedStudent`
- `upcomingLessons`
- `bookingRequests`

### Components

Use `PascalCase`.

Examples:
- `TeacherDashboard`
- `LessonCard`
- `StudentProfileDrawer`
- `BookingRequestModal`

### Pages

Use format:

```ts
{Domain}Page.tsx
```

Examples:
- `DashboardPage.tsx`
- `CalendarPage.tsx`
- `StudentsPage.tsx`
- `MatchingPage.tsx`

### DB/API Mapping

Backend and DB use `snake_case`.
Frontend uses `camelCase`.

Example:
- `scheduled_start_at` -> `scheduledStartAt`
- `booking_request_id` -> `bookingRequestId`
- `match_score` -> `matchScore`
- `teacher_response_message` -> `teacherResponseMessage`

Never mix naming styles inside UI state.

---

## 5. API Response Contract

Frontend must expect only these response shapes:

```ts
{ data: ... }
```

or:

```ts
{ error: ... }
```

Frontend must not depend on:

```ts
{ success: true }
```

If backend returns an unexpected shape, the frontend should treat it as an error state.

---

## 6. User Roles

The system has exactly 4 roles:

- `teacher`
- `student`
- `parent`
- `admin`

No frontend role may be invented.

| Role | Frontend Purpose |
| --- | --- |
| teacher | CRM, availability, lessons, students, communication |
| student | onboarding, matching, booking, lesson hub |
| parent | child oversight, booking, teacher communication, feedback |
| admin | user quality, moderation, system visibility |

---

## 7. Route Map

### Public Routes

- `/`
- `/login`
- `/register`
- `/pricing`
- `/teacher/:teacherId`

### Shared Auth Routes

- `/dashboard`
- `/settings`
- `/messages`
- `/notifications`

### Teacher Routes

- `/teacher/dashboard`
- `/teacher/calendar`
- `/teacher/students`
- `/teacher/lessons`
- `/teacher/availability`
- `/teacher/messages`
- `/teacher/profile`
- `/teacher/subscription`

### Student Routes

- `/student/dashboard`
- `/student/intake`
- `/student/matches`
- `/student/booking`
- `/student/lessons`
- `/student/messages`
- `/student/files`

### Parent Routes

- `/parent/dashboard`
- `/parent/children`
- `/parent/intake`
- `/parent/matches`
- `/parent/booking`
- `/parent/messages`
- `/parent/feedback`

### Admin Routes

- `/admin/dashboard`
- `/admin/users`
- `/admin/teachers`
- `/admin/reviews`
- `/admin/notifications`
- `/admin/system`

---

## 8. App Shell

Authenticated app layout must include:
- Header
- Sidebar
- Main content area
- Role-aware navigation
- User profile menu
- Notification indicator
- Loading boundary
- Error boundary

The sidebar must change by role.

No user should see navigation that does not belong to their role.

---

## 9. Core Pages by Role

### 9.1 Teacher Frontend

Teacher frontend is the CRM workspace.

#### Teacher Dashboard

Purpose:
Give the teacher a daily operational overview.

Modules:
- Today’s lessons
- Upcoming lessons
- Pending booking requests
- Active students
- Availability status
- Subscription status
- Recent messages
- Quick actions

Primary CTA:
Update Availability

Secondary CTAs:
- Add Student
- View Calendar
- Write Lesson Note

#### Teacher Calendar

Purpose:
Show scheduled lessons and availability.

Data entities:
- `lessons`
- `availability_slots`
- `booking_requests`

Required states:
- Today
- Week view
- Empty calendar
- Lesson cancelled
- Lesson completed

#### Teacher Students CRM

Purpose:
Manage active student relationships.

Data entities:
- `teacher_students`
- `students`
- `lesson_notes`
- `lessons`

Student card should show:
- Student name
- Subject
- Last lesson
- Next lesson
- Status
- Internal notes indicator

#### Teacher Availability

Purpose:
Allow teacher to define weekly availability.

Data entity:
- `availability_slots`

Rules:
- `dayOfWeek` must map from `day_of_week`
- `startTime` must map from `start_time`
- `endTime` must map from `end_time`
- inactive slots should be visually muted

#### Teacher Profile

Purpose:
Manage public teacher identity.

Data entities:
- `users`
- `teacher_profiles`
- `teacher_subjects`
- `subjects`

Fields:
- full name
- profile image
- bio
- hourly rate
- location type
- city
- subjects
- levels
- years experience

### 9.2 Student Frontend

Student frontend is focused on speed.

#### Student Dashboard

Purpose:
Show the next lesson and the most relevant actions.

Modules:
- Next lesson
- Active teacher
- Upcoming lessons
- Messages
- Files
- Latest shared summary

Primary CTA:
Find a Teacher

#### Student Intake Wizard

Purpose:
Collect learning needs.

Data entity:
- `student_intakes`

Steps:
- Subject
- Level / grade
- Goal
- Location preference
- Budget
- Preferred days
- Preferred time ranges
- Learning style
- Urgency

Frontend must not show long forms if the step can be split.

#### Match Results

Purpose:
Show exactly 3 teacher matches.

Data entity:
- `match_results`

Rules:
- Show max 3 results.
- Each result must show rank, teacher, match score, reason, price, location type, and availability.
- No infinite scrolling.
- No “load more teachers” in MVP.

Primary CTA:
Book Lesson

#### Booking Screen

Purpose:
Create booking request.

Data entity:
- `booking_requests`

Fields:
- selected teacher
- student
- requested start
- requested end
- optional student message

Statuses:
- pending
- approved
- rejected
- expired
- cancelled

### 9.3 Parent Frontend

Parent frontend is about control and peace of mind.

#### Parent Dashboard

Purpose:
Give parent visibility over child learning.

Modules:
- Selected child
- Next lesson
- Upcoming lessons
- Teacher messages
- Latest teacher feedback / shared summary
- Payment tracking placeholder
- Quick actions

Primary CTA:
Find Teacher for Child

#### Children Management

Purpose:
Allow parent to manage linked student profiles.

Data entity:
- `students`

Fields:
- child full name
- grade level
- age group
- learning goals

Rules:
- Parent can create or select child profile.
- Parent can run intake for child.
- Parent should not see teacher-private notes.

#### Parent Match Flow

Same as student matching, but created on behalf of a child.

Frontend must clearly show:
Finding a teacher for: `{childName}`

#### Parent Messages

Purpose:
Allow parent communication with teacher.

Data entities:
- `conversations`
- `messages`

Rules:
- Keep professional tone.
- No WhatsApp dependency.
- Email notifications may alert parent.

### 9.4 Admin Frontend

Admin frontend is operational control.

#### Admin Dashboard

Purpose:
Show system health and activity.

Modules:
- New users
- Active teachers
- Match conversion
- Pending reviews
- Failed notifications
- Recent admin actions

#### User Management

Data entities:
- `users`
- `teacher_profiles`
- `students`

Actions:
- view user
- block user
- reactivate user
- verify teacher

#### Review Moderation

Data entity:
- `reviews`

Actions:
- view review
- hide / flag if needed
- inspect lesson context

#### Notifications Monitor

Data entity:
- `notifications`

Statuses:
- pending
- sent
- failed

---

## 10. Frontend Data Types

Frontend types should live in:
`src/types/`

Recommended files:
- `src/types/user.types.ts`
- `src/types/student.types.ts`
- `src/types/teacher.types.ts`
- `src/types/lesson.types.ts`
- `src/types/booking.types.ts`
- `src/types/matching.types.ts`
- `src/types/message.types.ts`
- `src/types/notification.types.ts`
- `src/types/subscription.types.ts`

Types must mirror backend contracts after camelCase mapping.

Example:

```ts
export type UserRole = 'teacher' | 'student' | 'parent' | 'admin';

export type LessonStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export type BookingStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'cancelled';
```

---

## 11. Global State

Recommended Zustand stores:
- `src/stores/authStore.ts`
- `src/stores/appStore.ts`
- `src/stores/roleStore.ts`
- `src/stores/notificationStore.ts`

### authStore

Should hold:
- `currentUser`
- `session`
- `authLoading`
- `isAuthenticated`

### appStore

Should hold:
- `sidebarOpen`
- `activeWorkspace`
- `selectedStudent`
- `selectedRoleView`

### notificationStore

Should hold:
- `unreadCount`
- `latestNotifications`

Do not store server source-of-truth data globally unless needed.

---

## 12. API Client Structure

Recommended structure:
- `src/api/client.ts`
- `src/api/auth.api.ts`
- `src/api/users.api.ts`
- `src/api/teachers.api.ts`
- `src/api/students.api.ts`
- `src/api/intakes.api.ts`
- `src/api/matching.api.ts`
- `src/api/bookings.api.ts`
- `src/api/lessons.api.ts`
- `src/api/messages.api.ts`
- `src/api/notifications.api.ts`

API layer must:
- attach Supabase JWT
- normalize `{ data }`
- normalize `{ error }`
- throw typed errors
- keep components clean

Components must not call fetch directly.

---

## 13. Loading / Empty / Error States

Every data-driven page must support:

### Loading

Use skeleton cards, not blank screens.

### Empty

Every empty state must include:
- short explanation
- clear next action

Example:
No lessons scheduled yet.
Once a lesson is booked, it will appear here.

### Error

Error state must include:
- simple message
- retry action
- no technical stack trace

---

## 14. UI Design Direction

Frontend must follow the StudyBuddy visual direction:
- Clean
- Fast
- Bento-based
- Professional
- Cyber-professional but not childish
- Minimal noise
- Clear hierarchy
- Dashboard-first feeling

Recommended visual language:
- Dark base
- Modular cards
- Soft glow
- Clear CTA color
- High contrast text
- Rounded cards
- Calm data density

Avoid:
- playful marketplace look
- overloaded cards
- too many colors
- generic SaaS templates
- social-feed feeling

---

## 15. MVP Boundaries

Frontend must not build UI for features outside MVP unless marked as placeholder.

Out of MVP:
- payment processing
- Stripe / Bit / Paybox integration
- invoices
- refunds
- disputes
- full Google Calendar sync
- AI-generated lesson summaries
- native mobile app
- learning center organizations
- KYC flow

Allowed placeholders:
- payment tracking manual label
- future billing page shell
- future analytics card disabled state

---

## 16. Lesson Lifecycle UI

Frontend must respect the booking lifecycle:

```text
student_intake
-> match_result
-> booking_request
-> lesson
-> review
```

Allowed lesson statuses:
- scheduled
- completed
- cancelled
- no_show

Frontend must not invent statuses like:
- done
- waiting
- finished
- upcoming
- missed

If UI needs display labels, map them separately.

Example:

```ts
const lessonStatusLabels = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No show',
};
```

---

## 17. Messaging Rules

Messaging is in-app.

Data entities:
- `conversations`
- `messages`

Message types:
- text
- file
- system

Frontend must support:
- message list
- conversation list
- read state
- system messages
- file indicator

MVP should avoid building a WhatsApp-like dependency.

---

## 18. Notifications Rules

MVP notification channel is primarily:
- email

Future channels may exist:
- push
- sms

Frontend may show in-app notification records, but must not assume push is implemented.

Notification statuses:
- pending
- sent
- failed

---

## 19. Access Control Rules

Frontend route guards must enforce role access.

Rules:
- Teacher cannot access parent dashboard.
- Parent cannot access teacher CRM.
- Student cannot access admin.
- Admin can access admin tools only.
- Shared pages must still filter data by backend permissions.

Frontend route guard is UX protection only.
Backend remains the authority.

---

## 20. Recommended Folder Structure

```text
src/
  api/
  assets/
  components/
    common/
    layout/
    dashboard/
    teacher/
    student/
    parent/
    admin/
    forms/
    cards/
    modals/
  features/
    auth/
    teacher-dashboard/
    student-matching/
    parent-dashboard/
    booking/
    lessons/
    messages/
    notifications/
  hooks/
  lib/
  pages/
  routes/
  stores/
  styles/
  types/
  utils/
```

---

## 21. Component Rules

Components should be small and domain-aware.

Good:
- `LessonCard.tsx`
- `TeacherMatchCard.tsx`
- `AvailabilitySlotEditor.tsx`
- `BookingRequestModal.tsx`
- `ParentChildSelector.tsx`

Bad:
- `Card2.tsx`
- `NewDashboard.tsx`
- `FinalModal.tsx`
- `TeacherThing.tsx`

---

## 22. Frontend Hard Rules

- Do not invent statuses.
- Do not invent roles.
- Do not create marketplace browsing UX.
- Do not expose teacher private notes to student or parent.
- Do not build payment processing in MVP.
- Do not call backend directly from components.
- Do not use DB snake_case inside UI state.
- Do not show more than 3 match results in MVP.
- Do not create generic dashboards; every dashboard is role-specific.
- Do not add WhatsApp dependency.

---

## 23. Definition of Done

A frontend screen is done only if:
- It follows role access rules.
- It uses sacred naming.
- It handles loading, empty, and error states.
- It maps backend snake_case to frontend camelCase.
- It uses API service layer.
- It has no invented statuses.
- It has clear primary CTA.
- It works with real backend contract or documented mock.
- It does not add out-of-MVP features.
- It matches the StudyBuddy design direction.

---

## 24. Final Rule

Frontend is not allowed to “design around” missing logic.

If backend/API/product contract is missing:
`[MISSING: exact contract or rule needed]`

If frontend receives conflicting rules:
`[CONFLICT: describe conflict]`

Then stop implementation until source-of-truth alignment is fixed.
