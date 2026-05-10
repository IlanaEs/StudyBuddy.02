# Codex_Task_Template.md

# Identity

This document defines the mandatory execution pipeline for ALL StudyBuddy.02 implementation tasks.

This is NOT only a task template.

This is:
- the execution contract
- the orchestration protocol
- the cross-agent workflow system
- the implementation pipeline controller

Every task inside StudyBuddy MUST pass through this pipeline.

No implementation is considered valid unless:
- all relevant agents reviewed it
- architectural alignment exists
- lifecycle integrity is preserved
- permissions are validated
- integration consistency is verified

---

# Core Philosophy

StudyBuddy is NOT developed as isolated features.

StudyBuddy is:
> a connected operational system.

Every implementation affects:
- lifecycle logic
- permissions
- relationships
- UX behavior
- API contracts
- DB integrity
- notifications
- dashboards
- matching behavior
- CRM continuity

This pipeline exists to prevent:
- agent drift
- architecture corruption
- hidden side effects
- lifecycle breakage
- fake "working" implementations

---

# Mandatory Pipeline Flow

Every task MUST pass through agents in THIS ORDER.

Skipping steps is forbidden.

---

# Stage 1 — Product Validation

## Responsible Agent
`Product_Agent.md`

## Purpose
Validate:
- business logic
- lifecycle legality
- workflow consistency
- scope correctness
- MVP alignment

## Questions
- does this fit StudyBuddy philosophy?
- does this violate locked product logic?
- does this accidentally create marketplace behavior?
- does this affect CRM continuity?
- does this violate no-payment MVP boundaries?

## Output
- approved product behavior
- locked constraints
- lifecycle expectations
- business rules
- rejected assumptions

If unclear:

```text
[MISSING PRODUCT DECISION]
```

STOP PIPELINE.

---

# Stage 2 — System Architecture Validation

## Responsible Agent
`System_Architect_Agent.md`

## Purpose
Validate:
- domain boundaries
- scalability
- separation of concerns
- architecture consistency
- dependency safety
- modularity
- anti-spaghetti structure

## Questions
- does this belong in this domain?
- does this create unsafe coupling?
- does this scale safely?
- does this duplicate lifecycle logic?
- does this introduce architectural drift?

---

# Stage 3 — UX/UI Validation

## Responsible Agent
`UXUI_Agent.md`

## Required If
Task affects:
- screens
- interactions
- flows
- states
- dashboards
- user-facing behavior

## Purpose
Validate:
- hierarchy
- operational clarity
- state visibility
- workflow continuity
- responsive behavior
- UX consistency

## Questions
- is the primary action obvious?
- does the flow reduce friction?
- does UI reflect real backend state?
- are empty/error states handled?
- does this preserve StudyBuddy operational UX?

---

# Stage 4 — Frontend Architecture Validation

## Responsible Agent
`Frontend_Agent.md`

## Required If
Task affects frontend.

## Purpose
Validate:
- component architecture
- state handling
- API integration
- frontend scalability
- responsive implementation
- contract alignment

## Questions
- does frontend rely on fake assumptions?
- are loading/error states correct?
- are enums aligned?
- is state deterministic?
- does implementation remain scalable?

---

# Stage 5 — Backend Validation

## Responsible Agent
`Backend_Agent.md`

## Required If
Task affects:
- API
- business logic
- lifecycle
- permissions
- transactions
- services
- repositories

## Purpose
Validate:
- business logic enforcement
- transaction safety
- lifecycle legality
- ownership enforcement
- API contracts
- backend architecture

## Questions
- are transitions legal?
- are permissions enforced?
- is transaction rollback safe?
- can double booking occur?
- does backend match product logic?

---

# Stage 6 — Supabase/Data Validation

## Responsible Agent
`Supabase_Data_Agent.md`

## Required If
Task affects:
- schema
- SQL
- migrations
- RLS
- relationships
- enums
- indexes
- storage

## Purpose
Validate:
- schema integrity
- naming rules
- relationship integrity
- enum consistency
- RLS safety
- migration safety

## Questions
- does schema match sacred naming?
- are relationships preserved?
- are RLS rules correct?
- are indexes needed?
- does this create orphan risks?

---

# Stage 7 — QA & Integration Validation

## Responsible Agent
`QA_Integration_Agent.md`

## ALWAYS REQUIRED

## Purpose
Validate:
- cross-layer consistency
- lifecycle continuity
- integration behavior
- edge cases
- failure recovery
- hidden corruption risks

## Questions
- do all layers agree?
- can stale state break the flow?
- are edge cases safe?
- are contracts aligned?
- does lifecycle survive failures?
- are permissions truly enforced?

Only QA may approve final system integrity.

---

# Pipeline Enforcement Rules

## A task CANNOT proceed if:

- Product Agent failed
- lifecycle unclear
- permissions unclear
- schema unclear
- UX contradicts backend
- backend contradicts DB
- frontend contradicts API
- QA detects corruption risk

---

# Core Task Structure

Every task MUST include ALL sections below.

---

## Required Sources of Truth

Before implementation, read:
- Sacred Names Convention
- DB Schema
- API Contracts

---

# Task Title

Clear implementation-oriented title.

Example:

```text
Implement booking approval transaction flow
```

---

# Objective

Describe:
- what is being built
- why it exists
- operational/business purpose
- affected workflow

Avoid vague startup language.

---

# Pipeline Scope

Define EXACTLY:

## Agents Required

Example:

```text
- Product_Agent
- Backend_Agent
- Supabase_Data_Agent
- QA_Integration_Agent
```

## Agents Not Required

Example:

```text
- UXUI_Agent
- Frontend_Agent
```

---

# Allowed Scope

Define explicitly what MAY change.

Example:

```text
- booking service
- lesson creation logic
- SQL migration
- tests
```

---

# Forbidden Scope

Define explicitly what MUST NOT change.

Example:

```text
- lesson statuses
- frontend screens
- payment logic
- matching algorithm
```

---

# Relevant Source of Truth

List ALL relevant documents.

Example:

```text
- Product_Agent.md
- Backend_Agent.md
- Supabase_Data_Agent.md
- Lesson Lifecycle
- Locked Booking Model
```

---

# Locked Product Rules

List mandatory product constraints.

Example:

```text
- only pending booking may be approved
- approved booking creates exactly one lesson
- no overlapping lessons allowed
- teacher must own booking
```

---

# Existing System Context

Describe:
- current architecture
- existing routes
- existing tables
- current lifecycle
- current frontend assumptions
- existing services

Codex must NEVER assume architecture automatically.

---

# Technical Requirements

Explicit implementation requirements.

Examples:

```text
- use transaction
- repository pattern required
- ownership enforcement required
- response contract required
- RLS assumptions must remain valid
```

---

# Lifecycle Impact

Define:
- affected states
- allowed transitions
- forbidden transitions
- affected workflows

---

# Permission Impact

Define:
- who may trigger action
- who may view data
- ownership requirements
- affected roles

---

# DB Impact

Define:
- tables touched
- migrations required
- constraints required
- indexes required
- RLS impact
- relationship impact

---

# Frontend Impact

Define:
- changed API expectations
- loading state implications
- enum impacts
- UI state changes
- error handling expectations

---

# Notification Impact

Define:
- triggered notifications
- notification failures
- entity references
- delivery expectations

---

# Edge Cases

Mandatory.

Examples:

```text
- duplicate booking
- stale frontend state
- expired request
- inactive teacher
- transaction failure
- notification failure
- deleted relationship
```

---

# API Contract

Define:

## Request

## Response

## Errors

Must follow StudyBuddy standards.

---

# Testing Requirements

Mandatory tests:

- happy path
- invalid permissions
- invalid ownership
- invalid transition
- rollback validation
- duplicate prevention
- edge cases
- contract consistency

---

# Expected Files

List all expected modified files.

---

# Migration Rules

If migration required:

- atomic
- reversible if possible
- naming convention required
- enums locked unless explicitly approved

---

# QA Acceptance Requirements

Before completion QA MUST verify:

- lifecycle integrity
- permission integrity
- transaction integrity
- no orphaned data
- no contract mismatch
- no hidden side effects
- edge-case survival
- rollback behavior
- cross-layer alignment

---

# Required Final Output

Every completed task MUST end with:

# Implementation Summary

## Product Alignment

## UX Impact

## Frontend Impact

## Backend Impact

## DB Impact

## Lifecycle Impact

## Permission Impact

## Notifications Impact

## Files Changed

## Migrations Added

## Edge Cases Covered

## Tests Added

## Risks Remaining

## Follow-Up Work

---

# Hard Failure Conditions

Task is automatically INVALID if it:

- skips required agents
- bypasses Product validation
- bypasses QA validation
- breaks lifecycle
- allows double booking
- leaks unauthorized data
- invents enums
- modifies locked architecture
- creates orphaned records
- introduces payment systems
- breaks API contracts
- violates RLS assumptions
- introduces hidden side effects
- ignores rollback safety
- creates marketplace behavior

---

# Final Rule

StudyBuddy development is:

- lifecycle-first
- relationship-first
- permission-first
- transaction-safe
- CRM-first
- integration-first

Codex is NOT allowed to "just code".

Codex must move through:
> structured multi-agent validation before implementation is considered complete.
