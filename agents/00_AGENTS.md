# AGENTS.md

# StudyBuddy.02 — Multi-Agent Operating Constitution

This document is the highest operational authority inside the StudyBuddy.02 repository.

It defines:
- product identity
- architectural philosophy
- agent responsibilities
- execution hierarchy
- validation flow
- lifecycle protection rules
- permission boundaries
- implementation constraints
- MVP boundaries
- integration standards

ALL agents MUST follow this document.

If any lower-level document conflicts with AGENTS.md:
AGENTS.md wins.

---

# 1. System Identity

StudyBuddy is NOT:
- a tutor marketplace
- a social platform
- a generic SaaS dashboard
- a CRUD management panel

StudyBuddy IS:
> a CRM-driven Matchmaking Operating System for private education.

The platform exists to:
- reduce operational chaos
- eliminate manual coordination
- reduce booking friction
- preserve relationship continuity
- improve tutor operational efficiency
- provide structured parent visibility
- create deterministic educational workflows

Every implementation must reinforce this identity.

---

# 2. Core Product Philosophy

## 2.1 Matchmaking > Marketplace

StudyBuddy is NOT designed for:
- endless browsing
- infinite tutor feeds
- random exploration
- marketplace discovery behavior

The platform MUST:
- curate
- filter
- guide
- reduce cognitive overload
- accelerate confident decision making

Default matching behavior:
```text
maximum 3 curated matches
```

NOT:
```text
infinite tutor listing
```

---

## 2.2 CRM First

CRM is NOT an additional feature.

CRM is:
- the retention engine
- the operational engine
- the continuity engine
- the anti-disintermediation engine

The system must continuously strengthen:
- teacher-student continuity
- lesson history continuity
- operational dependency on the platform

---

## 2.3 Lifecycle First

Every system entity has:
- valid states
- valid transitions
- invalid transitions
- terminal states

Lifecycle integrity is sacred.

No agent may:
- skip lifecycle stages
- invent temporary states
- bypass transactional flow
- create inconsistent entity states

---

## 2.4 Permission First

Frontend visibility is NOT security.

Permissions MUST be enforced by:
- backend validation
- ownership checks
- relationship checks
- Supabase RLS policies

The system must assume:
> frontend can be bypassed.

---

# 3. Locked System Architecture

The following systems are considered LOCKED ARCHITECTURE.

Agents may NOT contradict them without explicit product approval.

## Locked Systems

1. Lesson Lifecycle
2. Locked Booking Model
3. CRM Logic & Relationship OS
4. Master Matching Logic
5. Parent Dashboard Logic
6. Chat, Files & Notifications Logic
7. Subscription Logic
8. Role Permission Architecture
9. Supabase Auth + RLS Rules
10. No-Payment MVP Boundary

Violating these systems is considered:
```text
CRITICAL SYSTEM FAILURE
```

---

# 4. MVP Boundaries

The following systems are OUT OF MVP:

- payment gateways
- Stripe
- Bit / Paybox
- invoice generation
- payout systems
- tax systems
- wallet systems
- AI tutoring
- AI grading
- social feeds
- public tutor discovery feeds
- recommendation engines
- marketplace infinite browsing
- unrestricted messaging systems

If implementation requires these:

```text
[OUT OF MVP]
```

Do NOT prematurely architect future systems.

---

# 5. Source of Truth Hierarchy

All implementation decisions MUST follow this hierarchy:

## Level 1 — Locked Product Logic
- Lesson Lifecycle
- Booking Model
- CRM Logic
- Matching Logic
- Permission Logic

## Level 2 — AGENTS.md

## Level 3 — Product_Agent.md

## Level 4 — Backend_Agent.md
AND
Supabase_Data_Agent.md

## Level 5 — API Contracts

## Level 6 — Frontend_Agent.md

## Level 7 — UXUI_Agent.md

## Level 8 — Existing Implementation

If conflicts exist:
higher levels override lower levels.

Implementation convenience NEVER overrides product truth.

---

# 5.1 Core Source Of Truth Documents

All agents MUST follow:
- Sacred Names Convention
- DB Schema
- API Contracts

Core source of truth documents:
- Sacred Names Convention
- DB Schema v1
- StudyBuddy.03 — API Contracts

---

# 6. Global System Principles

Every system inside StudyBuddy must remain:

- deterministic
- lifecycle-safe
- transaction-safe
- permission-safe
- relationship-aware
- CRM-consistent
- operationally scalable
- frontend/backend aligned
- integration-safe

The platform must behave:
> predictably under real operational conditions.

---

# 7. Sacred Naming Rules

All agents MUST follow:

## General Rules

- `snake_case`
- lowercase only
- plural table names
- singular enum values
- explicit foreign key names

Correct:
```sql
teacher_profiles
booking_requests
teacher_students
availability_slots
```

Wrong:
```sql
TeacherProfile
bookingRequest
teacherStudentMap
```

---

# 8. Sacred Enum Rules

Enums are LOCKED ARCHITECTURE.

Agents MUST NOT:
- invent statuses
- invent temporary states
- create hidden transitions
- introduce inconsistent naming

If enum expansion is needed:

```text
[MISSING PRODUCT DECISION]
```

---

# 9. Agent Responsibilities

# 9.1 Product Agent

## Authority
Highest product authority.

## Responsible For
- business logic
- lifecycle legality
- workflow rules
- MVP boundaries
- system philosophy

## May Override
- UX
- frontend
- backend
- DB assumptions

---

# 9.2 System Architect Agent

## Authority
Highest technical architecture authority.

## Responsible For
- system architecture
- domain boundaries
- scalability
- separation of concerns
- long-term maintainability
- anti-spaghetti enforcement
- architectural consistency

## Protects
- modularity
- lifecycle-safe architecture
- dependency integrity
- domain isolation
- transaction-safe structure

## May Block
- bad abstractions
- architectural drift
- unsafe coupling
- scalability risks

---

# 9.3 UXUI Agent

## Responsible For
- workflow clarity
- operational UX
- hierarchy
- dashboard logic
- state visibility

## Cannot Override
- product logic
- backend lifecycle
- permission rules

---

# 9.4 Frontend Agent

## Responsible For
- frontend architecture
- state handling
- component systems
- API integration
- responsive implementation

## Cannot
- invent backend behavior
- invent states
- invent enums

---

# 9.5 Backend Agent

## Responsible For
- lifecycle enforcement
- business logic
- transactions
- ownership validation
- API contracts

## Backend Is
The operational enforcement layer.

---

# 9.6 Supabase Data Agent

## Responsible For
- schema integrity
- relationships
- RLS
- migrations
- constraints
- enums
- indexes

## Protects
- sacred naming
- lifecycle-safe persistence
- relationship integrity

---

# 9.7 QA Integration Agent

## Responsible For
- cross-layer validation
- lifecycle validation
- integration integrity
- edge-case validation
- hidden corruption detection

## Final Authority
QA has final production-readiness authority.

---

# 10. Mandatory Execution Pipeline

Every implementation task MUST follow this order:

```text
1. Product Validation
2. System Architecture Validation
3. UX Validation (if UI affected)
4. Frontend Validation (if frontend affected)
5. Backend Validation (if backend affected)
6. Supabase/Data Validation (if DB affected)
7. QA Integration Validation
```

Product decides WHAT.
System Architect decides HOW STRUCTURALLY.

Architecture validation must happen before UX, frontend, backend, and database implementation decisions.

Skipping stages is forbidden.

---

# 11. Codex Task Rules

ALL implementation tasks MUST use:
```text
Codex_Task_Template.md
```

Tasks are INVALID if they:
- skip required agents
- bypass QA
- bypass Product validation
- exceed scope
- invent architecture
- violate locked lifecycle logic

---

# 12. Backend Enforcement Rules

Backend MUST enforce:
- ownership
- permissions
- lifecycle legality
- transaction safety
- booking integrity
- CRM continuity

Frontend validation alone is NEVER sufficient.

---

# 13. Supabase & RLS Rules

Supabase is:
- the primary auth provider
- the relational data source
- the ownership enforcement layer

RLS is mandatory for user-facing data.

Frontend filtering alone is forbidden.

---

# 14. Frontend Rules

Frontend MUST:
- reflect real backend state
- handle loading/error/null states
- avoid fake assumptions
- preserve deterministic UX
- remain API-contract aligned

Frontend MUST NOT:
- simulate fake backend behavior
- invent statuses
- bypass lifecycle visibility

---

# 15. UX Rules

UX must prioritize:
- operational clarity
- fast comprehension
- low friction
- state visibility
- workflow continuity

StudyBuddy UX is:
```text
operational-first
```

NOT:
```text
decorative-first
```

---

# 16. Matching Rules

Matching MUST remain:
- curated
- deterministic
- availability-aware
- relationship-aware

Default result count:
```text
maximum 3 teachers
```

The system MUST NEVER become:
```text
marketplace browsing
```

---

# 17. Booking Rules

Booking integrity is CRITICAL.

The system MUST prevent:
- double booking
- stale approvals
- overlapping lessons
- partial writes
- invalid transitions

Booking approval MUST be atomic.

---

# 18. CRM Rules

CRM relationships are CORE ARCHITECTURE.

The system MUST preserve:
- teacher-student continuity
- lesson continuity
- relationship history
- private note visibility
- shared summary visibility

Archived relationships MUST behave differently from active ones.

---

# 19. Parent Visibility Rules

Parents may access:
- linked children only
- child lessons
- child summaries
- child dashboard visibility

Parents MUST NEVER access:
- unrelated children
- teacher private notes
- unrelated CRM data

Parent visibility bugs are considered:
```text
SEVERE FAILURES
```

---

# 20. Notification Rules

Notifications MUST be:
- event-driven
- lifecycle-aware
- relationship-aware

MVP default:
```text
email-first
```

Notification failure MUST NOT corrupt lifecycle transactions.

---

# 21. File Rules

Files MUST:
- inherit ownership visibility
- remain relationship-scoped
- use Supabase Storage
- avoid unrestricted access

---

# 22. Forbidden Global Behaviors

Agents MUST NEVER:

- invent product logic
- invent enums
- bypass lifecycle rules
- bypass ownership validation
- expose unauthorized data
- implement payments in MVP
- create marketplace browsing
- create hidden side effects
- bypass transactions
- trust frontend-only validation
- create orphaned data
- violate RLS assumptions
- silently break API contracts

---

# 23. Required Validation Standards

Every implementation MUST validate:

## Product Alignment
Business logic correct.

## Lifecycle Integrity
Valid transitions only.

## Permission Integrity
Ownership enforced everywhere.

## API Integrity
Contracts remain stable.

## DB Integrity
Relationships and constraints valid.

## Transaction Safety
Rollback-safe behavior.

## Edge Cases
Failure conditions handled.

## Integration Integrity
All layers aligned.

---

# 24. Hard Failure Conditions

Implementation is automatically INVALID if it:

- allows double booking
- exposes unauthorized data
- breaks lifecycle continuity
- creates orphaned records
- invents enum values
- violates MVP boundaries
- bypasses QA
- bypasses Product validation
- violates RLS assumptions
- introduces hidden side effects
- creates frontend/backend desync
- corrupts CRM continuity
- creates marketplace behavior

---

# 25. Communication Standards

All agents must communicate using:
- implementation-aware language
- operational terminology
- explicit constraints
- deterministic reasoning
- architecture-aware decisions

Avoid:
- vague PRD language
- startup buzzwords
- speculative architecture
- decorative explanations

---

# 26. Final Rule

StudyBuddy succeeds ONLY if:

- lifecycle integrity survives scale
- permissions remain secure
- CRM continuity remains stable
- matching remains curated
- operational chaos is reduced
- every layer stays aligned
- every workflow remains deterministic

The platform must behave as:
> one unified operational system,

NOT:
> disconnected AI-generated features pretending to work together.
