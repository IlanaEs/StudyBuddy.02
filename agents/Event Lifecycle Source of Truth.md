# StudyBuddy.02 — Event Lifecycle Source of Truth

Defines:
- System event architecture
- Event naming
- Lifecycle states
- Trigger rules
- Reliability principles
- Notification coupling
- Audit strategy
- Async workflow behavior

Based on:
- Sacred Naming Convention
- DB Schema v1
- Roles Mapping
- Product & Market Research

---

# 1. Purpose

The Event System is the operational backbone of StudyBuddy.

Every meaningful action in the platform MUST generate deterministic system events.

Events power:
- Notifications
- CRM automation
- Analytics
- Audit logs
- Matching reliability
- Dashboard updates
- Future AI systems
- Webhooks/integrations

---

# 2. Sacred Event Principles

## Core Rules

### 1. Every important action is an event

If the system changes state:
→ emit event

### 2. Events are immutable

Never edit past events.

Allowed:
- append new event
- archive event
- retry failed processing

Forbidden:
- overwrite history

### 3. Event names are sacred

One action = one canonical event name.
Never invent variants.

### 4. Events are append-only

Events represent historical truth.

### 5. Side effects happen AFTER event creation

Order:
1. state change
2. event emitted
3. async processing
4. notifications
5. analytics updates

---

# 3. Sacred Event Naming Convention

## Format

```text
{domain}.{entity}.{action}
```

## Examples

### Booking

- `booking.request.created`
- `booking.request.approved`
- `booking.request.rejected`
- `booking.request.expired`

### Lesson

- `lesson.created`
- `lesson.completed`
- `lesson.cancelled`
- `lesson.reminder.sent`

### Matching

- `matching.results.generated`
- `matching.teacher.selected`

### CRM

- `crm.student.created`
- `crm.note.created`

### Notifications

- `notification.email.sent`
- `notification.push.failed`

---

# 4. Event Categories

| Category | Purpose |
| --- | --- |
| Domain Events | Core business actions |
| System Events | Internal infrastructure |
| Notification Events | Delivery lifecycle |
| Audit Events | Security & moderation |
| Analytics Events | Product insights |

---

# 5. Core Domain Event Lifecycle

## Student Intake Lifecycle

### Flow

```text
student_intake.created
-> matching.results.generated
-> matching.teacher.selected
-> booking.request.created
```

### Allowed States

| Entity | Allowed Status |
| --- | --- |
| `student_intakes` | `open -> matched -> closed` |

Must match sacred enums exactly.

## Booking Lifecycle

### Flow

```text
booking.request.created
-> booking.request.approved
-> lesson.created
```

OR

```text
booking.request.rejected
```

OR

```text
booking.request.expired
```

OR

```text
booking.request.cancelled
```

### Reliability Rule

A booking request MUST lock:
- teacher
- time range
- slot availability

To prevent:
- double booking
- race conditions

Based on marketplace reliability architecture.

## Lesson Lifecycle

### Flow

```text
lesson.created
-> lesson.reminder.scheduled
-> lesson.started
-> lesson.completed
```

OR

```text
lesson.cancelled
```

OR

```text
lesson.no_show
```

### Allowed Statuses

| Status |
| --- |
| `scheduled` |
| `completed` |
| `cancelled` |
| `no_show` |

Must match DB enums exactly.

## CRM Lifecycle

### Student Relationship

```text
crm.student.created
-> crm.student.active
-> crm.student.archived
```

### Lesson Notes

```text
crm.note.created
crm.note.updated
```

## Conversation Lifecycle

### Flow

```text
conversation.created
-> message.sent
-> message.read
-> conversation.archived
```

## Notification Lifecycle

### Flow

```text
notification.created
-> notification.queued
-> notification.sent
-> notification.delivered
```

OR

```text
notification.failed
```

### Retry Rules

Critical Notifications
Must retry automatically.

Examples:
- lesson reminders
- booking approvals
- payment issues

### Retry Strategy

| Attempt | Delay |
| --- | --- |
| 1 | immediate |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | fallback channel |

---

# 6. Event Payload Structure

## Standard Shape

```json
{
  "event_id": "uuid",
  "event_name": "lesson.completed",
  "entity_type": "lesson",
  "entity_id": "uuid",
  "triggered_by_user_id": "uuid",
  "occurred_at": "timestamp",
  "payload": {}
}
```

---

# 7. Event Ownership Rules

Ownership MUST propagate.

Examples:

| Event | Visible To |
| --- | --- |
| `lesson.completed` | teacher, student, parent |
| `crm.note.created` | teacher only |
| `review.created` | teacher + admin |
| `admin.user.blocked` | admin only |

---

# 8. Event Idempotency Rules

Duplicate protection is mandatory.

The same event MUST NOT:
- create duplicate lessons
- send duplicate emails
- duplicate notifications

## Idempotency Key

Recommended:

```text
{event_name}:{entity_id}
```

---

# 9. Async Processing Rules

Events SHOULD be processed asynchronously.

Examples:
- emails
- analytics
- recommendation recalculation
- reminder scheduling

## Synchronous Only For

- authorization
- booking lock
- payment validation
- lesson creation

---

# 10. Audit Events

Sensitive actions MUST emit audit events.

Examples:
- `admin.user.blocked`
- `admin.teacher.verified`
- `admin.review.removed`
- `admin.settings.updated`

## Audit Events Are Immutable

Never delete audit history.

---

# 11. Analytics Events

## Product Metrics

Examples:
- `matching.completed`
- `booking.converted`
- `lesson.completed`
- `review.created`
- `teacher.subscription.upgraded`

## Purpose

Used for:
- conversion funnels
- retention
- PMF analysis
- teacher activity scoring
- reliability ranking

---

# 12. Notification Coupling Rules

Notifications are reactions to events, NOT direct business logic.

Correct:

```text
booking.request.approved
-> notification.email.sent
```

Wrong:

```text
approve booking
-> directly send email inline
```

---

# 13. Failure Handling

## Event Processing Failure

If async consumer fails:
- mark failed
- log error
- retry safely
- never lose event

## Dead Letter Queue (Future)

Recommended for:
- failed emails
- webhook failures
- analytics processor failures

---

# 14. Event Storage Recommendation

## Recommended Table

`system_events`

## Suggested Columns

| Column |
| --- |
| `id` |
| `event_name` |
| `entity_type` |
| `entity_id` |
| `triggered_by_user_id` |
| `payload` |
| `status` |
| `retry_count` |
| `occurred_at` |
| `processed_at` |

---

# 15. Future Expansion

Future integrations MAY consume events:
- AI recommendations
- calendar sync
- mobile push systems
- external CRM integrations
- webhook marketplace
- automation engine

---

# 16. Sacred Principle

If business logic changes state:
→ emit event.

If event does not exist:
→ the system has no reliable history.

Event consistency is mandatory for:
- scaling
- analytics
- debugging
- AI automation
- trust
- operational reliability
