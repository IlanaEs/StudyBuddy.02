# API_Contracts.md

# StudyBuddy.02 — API Contracts

This document defines the official API contract rules for StudyBuddy.02.

It exists to keep:
- frontend and backend aligned
- response formats consistent
- lifecycle states predictable
- permissions explicit
- nullable fields safe
- integration QA possible

This document is mandatory for:
- Frontend Agent
- Backend Agent
- Supabase Data Agent
- QA Integration Agent
- Codex tasks

---

# 1. Core API Philosophy

StudyBuddy APIs are not generic CRUD endpoints.

They represent:
- lifecycle actions
- CRM relationships
- booking state transitions
- matching decisions
- role-based visibility
- operational dashboards

Every API must be:
- role-aware
- ownership-aware
- lifecycle-aware
- state-safe
- frontend-friendly
- QA-testable

---

# 2. Global Response Format

All successful responses MUST use a single top-level `data` key:

```json
{
  "data": {}
}
```

All error responses MUST use a single top-level `error` key:

```json
{
  "error": "Human readable error message"
}
```

Never mix formats.

The API MUST NOT return a top-level success boolean. Response success is communicated by HTTP status code plus the presence of `data`.

Wrong:

```json
{
  "result": {}
}
```

Wrong:

```json
{
  "message": "ok",
  "payload": {}
}
```

---

# 3. Naming Convention

API payload fields MUST use:

```text
snake_case
```

Correct:

```json
{
  "teacher_id": "uuid",
  "scheduled_start_at": "2026-05-10T16:00:00Z"
}
```

Wrong:

```json
{
  "teacherId": "uuid",
  "scheduledStartAt": "2026-05-10T16:00:00Z"
}
```

Frontend may map to camelCase internally, but API contracts stay snake_case.

---

# 4. Date & Time Format

All API timestamps MUST use ISO 8601 strings.

Example:

```json
{
  "created_at": "2026-05-10T18:30:00Z"
}
```

Rules:
- backend stores canonical timestamps
- frontend handles display formatting
- timezone conversion belongs to presentation layer
- API must not return informal dates

Wrong:

```json
{
  "date": "tomorrow at 5"
}
```

---

# 5. ID Format

All IDs must be UUID strings.

Example:

```json
{
  "id": "b8f7f9f1-1e2a-4f2b-bf53-03a45e82f3b1"
}
```

Do not expose internal numeric IDs.

---

# 6. Error Code Standards

Use consistent status codes:

| Code | Meaning |
|---|---|
| 400 | Invalid request |
| 401 | Unauthenticated |
| 403 | Forbidden / ownership mismatch |
| 404 | Entity not found or not visible |
| 409 | Conflict / invalid state |
| 422 | Validation failed |
| 500 | Unexpected server error |

Errors must be safe.

Do not expose:
- raw SQL errors
- stack traces
- auth tokens
- internal table structure
- sensitive ownership details

---

# 7. Pagination Contract

All list endpoints must support pagination when result size may grow.

Request query:

```text
?page=1&limit=20
```

Response:

```json
{
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "has_next": false
    }
  }
}
```

Unbounded list endpoints are forbidden.

---

# 8. Nullable Field Rules

Nullable fields must be explicit.

Use:

```json
{
  "meeting_link": null,
  "completed_at": null
}
```

Do not omit fields randomly.

Frontend must be able to safely render:
- loading state
- empty state
- null value
- missing optional feature

---

# 9. Enum Rules

API enum values must match DB enums exactly.

Do not invent API-only enum values.

Allowed examples:

```text
booking_status:
pending
approved
rejected
expired
cancelled
```

```text
lesson_status:
scheduled
completed
cancelled
no_show
```

Forbidden examples:

```text
in_progress
awaiting_payment
done
rescheduled
pending_teacher
```

If new enum is needed:

```text
[MISSING PRODUCT DECISION]
```

---

# 10. Auth Contract

Protected endpoints require:

```http
Authorization: Bearer <supabase_jwt>
```

Backend must:
- verify JWT
- resolve local user
- enforce role
- enforce ownership
- enforce relationship access

Frontend role checks are not enough.

---

# 11. Ownership Contract

Every protected API must define:

- allowed roles
- ownership rule
- visibility rule
- forbidden access case

Example:

```text
Only the assigned teacher may approve a booking request.
```

Example:

```text
A parent may access only students linked to their user.
```

---

# 12. Core API Domains

The API is organized around domains:

```text
/auth
/users
/teachers
/students
/parents
/matching
/bookings
/lessons
/crm
/conversations
/files
/notifications
/subscriptions
/admin
```

Avoid generic routes like:

```text
/data
/actions
/dashboard-api
/misc
```

---

# 13. Canonical API Contract Examples

These examples define the approved response envelope and naming style for the core API domains. They are governance examples only; they do not require product endpoints to exist before the product scope asks for them.

## 13.1 auth

Auth responses MUST wrap session and local user data in `data`.

Signup/login response example:

```json
{
  "data": {
    "user": {
      "id": "b8f7f9f1-1e2a-4f2b-bf53-03a45e82f3b1",
      "email": "teacher@example.com",
      "role": "teacher",
      "full_name": "Teacher Name",
      "phone": null,
      "profile_image_url": null,
      "status": "active",
      "created_at": "2026-05-10T18:30:00Z",
      "updated_at": "2026-05-10T18:30:00Z"
    },
    "session": {
      "access_token": "supabase-access-token",
      "refresh_token": "supabase-refresh-token",
      "expires_at": "2026-05-10T19:30:00Z"
    }
  }
}
```

Auth error response example:

```json
{
  "error": "Invalid email or password"
}
```

## 13.2 users

User responses MUST use the sacred `users` fields and approved `user_role` / `user_status` enum values.

```json
{
  "data": {
    "user": {
      "id": "b8f7f9f1-1e2a-4f2b-bf53-03a45e82f3b1",
      "email": "parent@example.com",
      "role": "parent",
      "full_name": "Parent Name",
      "phone": "+972501234567",
      "profile_image_url": null,
      "status": "active",
      "created_at": "2026-05-10T18:30:00Z",
      "updated_at": "2026-05-10T18:30:00Z"
    }
  }
}
```

## 13.3 teacher_profiles

Teacher profile responses MUST keep the resource name and foreign keys aligned with `teacher_profiles`.

```json
{
  "data": {
    "teacher_profile": {
      "id": "8a68dd3f-a7e8-4f25-98ef-6eacfc9f74f1",
      "user_id": "b8f7f9f1-1e2a-4f2b-bf53-03a45e82f3b1",
      "bio": "Experienced math teacher.",
      "hourly_rate": 150,
      "location_type": "online",
      "city": null,
      "rating_avg": 0,
      "rating_count": 0,
      "is_verified": false,
      "is_active": true,
      "last_active_at": null,
      "created_at": "2026-05-10T18:30:00Z",
      "updated_at": "2026-05-10T18:30:00Z"
    }
  }
}
```

## 13.4 students

Student responses MUST expose only students visible to the authenticated user.

```json
{
  "data": {
    "student": {
      "id": "d5b6f8f4-1b85-4c0f-8b9b-2439585db492",
      "user_id": null,
      "parent_user_id": "b8f7f9f1-1e2a-4f2b-bf53-03a45e82f3b1",
      "full_name": "Student Name",
      "grade_level": "10",
      "age_group": "15-16",
      "learning_goals": "Improve algebra confidence.",
      "notes": null,
      "created_at": "2026-05-10T18:30:00Z",
      "updated_at": "2026-05-10T18:30:00Z"
    }
  }
}
```

## 13.5 student_intakes

Student intake responses MUST use approved `intake_status` values only: `open`, `matched`, `closed`.

```json
{
  "data": {
    "student_intake": {
      "id": "03c0f842-7c52-4300-9882-2cd247cda5d2",
      "student_id": "d5b6f8f4-1b85-4c0f-8b9b-2439585db492",
      "created_by_user_id": "b8f7f9f1-1e2a-4f2b-bf53-03a45e82f3b1",
      "subject_id": "1dd859f1-a6bb-45bf-9d20-7cd30d390d2f",
      "level": "High school",
      "goal": "Prepare for final exam.",
      "location_preference": "online",
      "city": null,
      "budget_min": 100,
      "budget_max": 180,
      "preferred_days": ["sunday", "tuesday"],
      "preferred_time_ranges": ["16:00-19:00"],
      "learning_style": "structured",
      "urgency": "high",
      "status": "open",
      "created_at": "2026-05-10T18:30:00Z",
      "updated_at": "2026-05-10T18:30:00Z"
    }
  }
}
```

## 13.6 match_results

Match result responses MUST preserve ranked matching and link back to `student_intakes`.

```json
{
  "data": {
    "match_results": [
      {
        "id": "9f3be0e1-71de-47ef-b86f-18e330f133d7",
        "intake_id": "03c0f842-7c52-4300-9882-2cd247cda5d2",
        "teacher_id": "8a68dd3f-a7e8-4f25-98ef-6eacfc9f74f1",
        "rank": 1,
        "match_score": 94.5,
        "reason": "Strong subject fit and matching availability.",
        "was_selected": false,
        "created_at": "2026-05-10T18:30:00Z",
        "updated_at": "2026-05-10T18:30:00Z"
      }
    ]
  }
}
```

## 13.7 booking_requests

Booking request responses MUST use approved `booking_status` values only: `pending`, `approved`, `rejected`, `expired`, `cancelled`.

```json
{
  "data": {
    "booking_request": {
      "id": "44c5e36d-8d93-433b-a99f-bec31aa6e743",
      "student_id": "d5b6f8f4-1b85-4c0f-8b9b-2439585db492",
      "teacher_id": "8a68dd3f-a7e8-4f25-98ef-6eacfc9f74f1",
      "match_result_id": "9f3be0e1-71de-47ef-b86f-18e330f133d7",
      "requested_start_at": "2026-05-10T16:00:00Z",
      "requested_end_at": "2026-05-10T17:00:00Z",
      "status": "pending",
      "student_message": "Can we focus on algebra?",
      "teacher_response_message": null,
      "created_at": "2026-05-10T18:30:00Z",
      "updated_at": "2026-05-10T18:30:00Z"
    }
  }
}
```

## 13.8 lessons

Lesson responses MUST use approved `lesson_status` values only: `scheduled`, `completed`, `cancelled`, `no_show`.

```json
{
  "data": {
    "lesson": {
      "id": "ad0f4b0c-5509-4870-bf1d-5ee5f2f06858",
      "booking_request_id": "44c5e36d-8d93-433b-a99f-bec31aa6e743",
      "teacher_id": "8a68dd3f-a7e8-4f25-98ef-6eacfc9f74f1",
      "student_id": "d5b6f8f4-1b85-4c0f-8b9b-2439585db492",
      "subject_id": "1dd859f1-a6bb-45bf-9d20-7cd30d390d2f",
      "status": "scheduled",
      "scheduled_start_at": "2026-05-10T16:00:00Z",
      "scheduled_end_at": "2026-05-10T17:00:00Z",
      "duration_minutes": 60,
      "location_type": "online",
      "meeting_link": null,
      "cancellation_reason": null,
      "completed_at": null,
      "created_at": "2026-05-10T18:30:00Z",
      "updated_at": "2026-05-10T18:30:00Z"
    }
  }
}
```

---

# 14. Matching API Rules

Matching must preserve:

```text
Matchmaking > Marketplace
```

The matching API must return:
- maximum 3 teachers
- rank
- match_score
- reason
- linked intake_id

Example response:

```json
{
  "data": {
    "intake_id": "uuid",
    "matches": [
      {
        "id": "uuid",
        "teacher_id": "uuid",
        "rank": 1,
        "match_score": 94.5,
        "reason": "Strong subject fit and matching availability."
      }
    ]
  }
}
```

Forbidden:
- infinite tutor browsing
- random teacher lists
- unfiltered marketplace results

---

# 15. Booking API Rules

Booking APIs must protect the locked booking model.

Booking approval must:
- verify teacher ownership
- verify booking is pending
- verify slot is still available
- prevent double booking
- create lesson atomically
- create/update CRM relationship
- return stable response

Approval response example:

```json
{
  "data": {
    "booking_request": {
      "id": "uuid",
      "status": "approved"
    },
    "lesson": {
      "id": "uuid",
      "status": "scheduled",
      "scheduled_start_at": "2026-05-10T16:00:00Z",
      "scheduled_end_at": "2026-05-10T17:00:00Z"
    }
  }
}
```

---

# 16. Lesson API Rules

Lesson APIs must preserve lifecycle integrity.

Allowed lesson statuses:

```text
scheduled
completed
cancelled
no_show
```

Lesson response example:

```json
{
  "data": {
    "id": "uuid",
    "teacher_id": "uuid",
    "student_id": "uuid",
    "subject_id": "uuid",
    "status": "scheduled",
    "scheduled_start_at": "2026-05-10T16:00:00Z",
    "scheduled_end_at": "2026-05-10T17:00:00Z",
    "meeting_link": null,
    "completed_at": null
  }
}
```

Do not add payment-based lesson statuses.

---

# 17. CRM API Rules

CRM APIs must be relationship-scoped.

Teacher CRM response example:

```json
{
  "data": {
    "student_id": "uuid",
    "relationship_status": "active",
    "source": "matched",
    "latest_lesson": null,
    "internal_notes": "Visible to teacher only."
  }
}
```

Rules:
- teacher sees own CRM students only
- private notes are teacher-only
- shared summaries may be visible to student/parent
- archived relationships must not behave as active

---

# 18. Parent Dashboard Contract

Parent dashboard must be scoped to linked children only.

Response example:

```json
{
  "data": {
    "selected_student": {
      "student_id": "uuid",
      "full_name": "Student Name",
      "grade_level": "10"
    },
    "children": [],
    "next_lesson": null,
    "alerts": [],
    "learning_metrics": null,
    "latest_teacher_feedback": null,
    "payment_summary": null,
    "quick_actions": []
  }
}
```

Rules:
- nullable fields must be explicit
- parent cannot access unrelated child
- private teacher notes must never appear

---

# 19. Chat Contract

Chat must be relationship-scoped.

Message response example:

```json
{
  "data": {
    "message_id": "uuid",
    "conversation_id": "uuid",
    "sender_user_id": "uuid",
    "message_type": "text",
    "content": "Message content",
    "created_at": "2026-05-10T18:30:00Z",
    "read_at": null
  }
}
```

Rules:
- conversation must belong to valid relationship
- archived conversations cannot behave as active
- unauthorized users cannot read messages

---

# 20. Files Contract

Files are stored in Supabase Storage.

API stores metadata only.

Response example:

```json
{
  "data": {
    "file_id": "uuid",
    "file_url": "storage-url",
    "file_name": "worksheet.pdf",
    "file_type": "application/pdf",
    "file_size_bytes": 245000,
    "lesson_id": "uuid",
    "student_id": "uuid",
    "uploaded_by_user_id": "uuid"
  }
}
```

Rules:
- no raw file blobs in relational tables
- file visibility follows lesson/student/message context
- unauthorized file access is forbidden

---

# 21. Notifications Contract

Notifications are email-first in MVP.

Response example:

```json
{
  "data": {
    "notification_id": "uuid",
    "type": "lesson_reminder",
    "channel": "email",
    "title": "Lesson reminder",
    "body": "You have a lesson tomorrow.",
    "related_entity_type": "lesson",
    "related_entity_id": "uuid",
    "status": "pending",
    "sent_at": null
  }
}
```

Do not create WhatsApp flows.

Do not add SMS unless explicitly approved.

---

# 22. Subscription Contract

Subscriptions belong to teachers.

Allowed plans:

```text
matchmaker
professional
business
```

Response example:

```json
{
  "data": {
    "teacher_id": "uuid",
    "plan": "professional",
    "status": "active",
    "monthly_price": 119,
    "commission_percentage": 0,
    "student_limit": 12
  }
}
```

MVP does not include real payment processing.

---

# 23. Admin Contract

Admin APIs must be explicit and protected.

Admin actions should be logged when relevant.

Response example:

```json
{
  "data": {
    "admin_action_id": "uuid",
    "action_type": "verify_teacher",
    "target_entity_type": "teacher",
    "target_entity_id": "uuid",
    "created_at": "2026-05-10T18:30:00Z"
  }
}
```

---

# 24. Versioning Rule

Breaking API changes require explicit approval.

Breaking changes include:
- renaming fields
- changing enum values
- changing response shape
- changing nullable behavior
- changing ownership visibility
- removing fields used by frontend

If breaking change is needed:

```text
[API BREAKING CHANGE: approval required]
```

---

# 25. Frontend Integration Rules

Frontend must not:
- assume fields not in contract
- invent statuses
- depend on mock-only values
- ignore null states
- bypass backend permission rules

Frontend must:
- render loading states
- render empty states
- render error states
- handle 401/403/404/409 safely

---

# 26. Backend Implementation Rules

Backend must:
- validate request body
- validate UUIDs
- validate roles
- validate ownership
- validate lifecycle state
- return stable response contracts
- avoid raw DB errors
- use transactions for lifecycle-changing actions

---

# 27. QA Contract Checklist

QA must validate:

- response shape
- enum values
- null handling
- role permissions
- ownership
- lifecycle state
- error codes
- frontend compatibility
- DB alignment
- edge cases

---

# 28. Hard Failure Conditions

API contract is invalid if it:

- returns inconsistent response format
- exposes unauthorized data
- exposes teacher private notes
- leaks child data to wrong parent
- invents enum values
- breaks lifecycle rules
- creates marketplace browsing
- introduces payment logic into MVP
- returns unbounded lists
- changes fields without approval
- returns raw DB errors
- bypasses ownership rules

---

# 29. Final Rule

StudyBuddy APIs are system contracts.

They must protect:
- lifecycle integrity
- frontend/backend alignment
- CRM continuity
- role-based visibility
- curated matching
- MVP scope

The API must never become:
> random JSON between disconnected layers.
