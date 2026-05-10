# StudyBuddy.02 — Permissions Source of Truth

Defines:
- Roles
- Access levels
- Ownership rules
- Visibility boundaries
- CRM privacy model
- Dashboard permissions
- Admin authority
- Future RBAC alignment

Based on:
- Sacred Naming Convention
- DB Schema v1
- Roles Mapping Document
- Market & Product Research

---

# 1. Core Permission Principle

StudyBuddy is a multi-role platform with strict ownership separation.

The system MUST always enforce:
- Privacy between unrelated users
- Parent/student relationship boundaries
- Teacher CRM ownership
- Admin moderation authority
- Role-based access control (RBAC)

---

# 2. Sacred Roles

| Role | Sacred Enum |
| --- | --- |
| Teacher | `teacher` |
| Student | `student` |
| Parent | `parent` |
| Admin | `admin` |

Must match:
`user_role` enum exactly.

---

# 3. Permission Model

## Permission Layers

| Layer | Meaning |
| --- | --- |
| Public | Visible without ownership |
| Authenticated | Requires login |
| Relationship-Based | Requires direct relationship |
| Ownership-Based | Requires entity ownership |
| Admin-Level | System-wide authority |

---

# 4. Teacher Permissions

## Teacher Core Authority

Teachers own:
- Their CRM
- Their availability
- Their students
- Their lesson notes
- Their pricing
- Their dashboard
- Their onboarding profile

## Teachers CAN

### Profile & CRM

- Edit own `teacher_profiles`
- Edit own `availability_slots`
- Edit own `teacher_subjects`
- Manage own `teacher_students`
- View own analytics

### Lessons

- Accept/reject `booking_requests`
- Create/update lesson states
- Upload `lesson_files`
- Write `lesson_notes`

### Communication

Access conversations related to:
- their students
- their lessons
- linked parents

### Notifications

- Receive booking notifications
- Receive lesson reminders
- Receive CRM alerts

## Teachers CANNOT

- Access other teachers’ CRM
- Access unrelated students
- Access system settings
- Access admin analytics
- Modify reviews directly
- Read unrelated conversations
- View private admin actions

---

# 5. Student Permissions

## Student Core Authority

Students own:
- Their learning flow
- Their onboarding intake
- Their bookings
- Their lesson history

## Students CAN

### Matching

- Create `student_intakes`
- View own `match_results`
- Create `booking_requests`

### Lessons

- View own lessons
- View shared lesson summaries
- Access uploaded lesson files

### Communication

- Chat with linked teachers
- Access own conversations

### Dashboard

View:
- upcoming lessons
- homework
- summaries
- files

## Students CANNOT

- View teacher CRM notes
- View internal teacher notes
- Modify teacher availability
- Access other students
- Access parent financial controls
- Access admin systems

---

# 6. Parent Permissions

## Parent Core Authority

Parents supervise linked students.

Parent authority exists ONLY through:
- `parent_student_links`
- or `students.parent_user_id`

## Parents CAN

### Student Oversight

- View linked child dashboards
- View upcoming lessons
- View payment tracking
- View teacher feedback
- View progress summaries

### Communication

- Chat with teachers
- Coordinate logistics
- Receive notifications

### Booking Flow

- Create student onboarding intake
- Book lessons for child

## Parents CANNOT

- Access unrelated students
- Access teacher internal CRM notes
- Edit teacher data
- Access admin systems
- Modify lesson history retroactively

---

# 7. Admin Permissions

## Admin Core Authority

Admins are system moderators and operators.
Admins have global visibility.

## Admins CAN

### User Management

- View all users
- Block/unblock users
- Verify teachers
- Moderate reviews

### System Oversight

- Access analytics
- Access logs
- Access notifications
- Access admin actions
- Access moderation queues

### Support & Disputes

- Access conversations for dispute handling
- Access lesson metadata
- Investigate abuse reports

### System Configuration

- Edit `system_settings`
- Manage verification systems

## Admins CANNOT

- Modify financial records manually
- Impersonate users silently
- Modify lesson summaries without audit trail

---

# 8. CRM Privacy Rules

## Teacher CRM Isolation

`teacher_students` is private to the owning teacher.

Meaning:
- Teacher A CANNOT see Teacher B students
- Internal CRM notes are NEVER public
- `internal_notes` are teacher-only

## Shared vs Private Lesson Notes

| Field | Visibility |
| --- | --- |
| `note_private` | Teacher only |
| `shared_summary` | Student + Parent |
| `homework` | Student + Parent |

Based on:
`lesson_notes` schema.

---

# 9. Conversation Permissions

## Conversations Access Rule

A user may access a conversation ONLY if:
- They are the teacher
- They are the student
- They are the linked parent
- They are admin

## Messages

Users may:
- read own messages
- send messages in owned conversations

Users may NOT:
- edit other user messages
- access archived unrelated conversations

---

# 10. Booking & Lesson Permissions

## Booking Requests

### Student/Parent

Can:
- create booking requests
- cancel pending requests

Cannot:
- approve requests

### Teacher

Can:
- approve/reject booking requests
- respond to requests

Cannot:
- modify historical requests improperly

---

# 11. Availability Permissions

## Availability Ownership

Only the owning teacher may:
- create slots
- update slots
- disable slots

## Booking Lock Protection

A slot with active booking dependency:
MUST NOT be deleted directly.

System must:
- reject deletion
- OR require cancellation flow first

Based on marketplace reliability logic.

---

# 12. Review Permissions

## Students/Parents

Can:
- create reviews

Only after:
- completed lesson

## Teachers

Cannot:
- edit reviews
- delete reviews

## Admins

Can:
- moderate abusive reviews
- archive fraudulent reviews

---

# 13. Notification Permissions

Users receive ONLY notifications related to:
- owned lessons
- owned conversations
- owned bookings
- linked students

## Notification Channels

Sacred enum:
- `email`
- `push`
- `sms`

Must match enum exactly.

---

# 14. Public Visibility Rules

## Public Teacher Data

Visible publicly:
- teacher name
- profile image
- bio
- subjects
- rating
- city
- hourly rate
- verification badge

## Private Teacher Data

Never public:
- phone
- internal CRM data
- earnings
- availability logic
- student lists

---

# 15. Row Level Security (RLS) Principles

Supabase RLS MUST enforce:

| Table | Protection Logic |
| --- | --- |
| `teacher_profiles` | owner-only edit |
| `teacher_students` | teacher-owned only |
| `lesson_notes` | scoped by relationship |
| `messages` | conversation participant only |
| `booking_requests` | relationship-only |
| `notifications` | user-owned only |
| `admin_actions` | admin-only |

---

# 16. Audit & Security Rules

Sensitive actions MUST generate logs.

Examples:
- user blocked
- teacher verified
- review removed
- admin moderation
- subscription changes

Stored in:
`admin_actions`

---

# 17. Sacred Permission Principle

If ownership is unclear:
- deny access
- validate relationship
- verify role
- return authorization error

Security > convenience.

---

# 18. Future Expansion Rules

Future RBAC extensions MAY include:
- moderator
- support_agent
- learning_center_manager
- finance_admin

But:
- MUST use sacred enum conventions
- MUST maintain ownership isolation
- MUST preserve CRM privacy boundaries
