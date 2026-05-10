# StudyBuddy.02
# StudyBuddy.02

AI-powered tutor matchmaking and teacher CRM platform.

---

# Overview

StudyBuddy.02 is a SaaS-enabled marketplace for private education.

The platform combines:

* smart tutor matchmaking
* teacher CRM
* lesson scheduling
* booking workflows
* real-time availability
* communication tools

Instead of forcing students to browse endless tutor lists, the system returns only 3 curated tutor matches based on onboarding data and teacher availability.

---

# The Problem

## Students

* too many irrelevant tutor profiles
* fake availability
* slow communication
* endless coordination

## Teachers

* schedule chaos
* cancellations
* manual coordination
* fragmented communication
* no operational tools

Most tutors still manage their work through:

* WhatsApp
* spreadsheets
* notebooks

---

# The Solution

StudyBuddy combines:

* intelligent matching
* real-time availability
* teacher CRM infrastructure

Teachers manage:

* schedules
* students
* lessons
* communication

Students receive:

* fast matching
* accurate availability
* simplified booking

---

# Core Principles

## Triple Match Rule

The system returns:

* only 3 relevant tutors

No endless browsing.

---

## CRM-Driven Marketplace

Teacher CRM activity powers:

* matching quality
* availability accuracy
* operational reliability

---

## Anti-Friction UX

Every flow must reduce:

* operational chaos
* coordination overhead
* decision fatigue

---

# MVP Scope

## Student Side

* onboarding wizard
* triple-match engine
* booking requests
* lesson dashboard
* lesson chat

## Teacher Side

* CRM dashboard
* availability management
* student management
* lesson tracking
* notifications

## Shared Infrastructure

* authentication
* real-time messaging
* file uploads
* email notifications

---

# Tech Stack

| Layer            | Technology          |
| ---------------- | ------------------- |
| Frontend         | Next.js             |
| UI               | React + TailwindCSS |
| Backend          | Node.js + Express   |
| Database         | PostgreSQL          |
| Auth             | Supabase Auth       |
| Storage          | Supabase Storage    |
| Realtime         | Supabase Realtime   |
| Hosting          | Vercel              |
| State Management | Zustand             |

---

# System Architecture

```text id="7yn1mc"
Client (Next.js)
        ↓
API Layer (Express)
        ↓
Business Logic
        ↓
Supabase PostgreSQL
```

---

# Repository Structure

```text id="a6r7xg"
studybuddy.02/
│
├── apps/
│   ├── frontend/
│   └── backend/
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── policies/
│
├── docs/
│
├── shared/
│
├── agents/
│
├── .env.example
├── README.md
└── AGENTS.md
```

---

# Frontend Structure

```text id="6p0b8x"
frontend/
│
├── app/
├── components/
├── features/
├── hooks/
├── services/
├── store/
└── styles/
```

---

# Backend Structure

```text id="6lcg8u"
backend/
│
├── routes/
├── controllers/
├── services/
├── repositories/
├── middleware/
├── validators/
└── db/
```

---

# Database Rules

## Supabase is the single source of truth.

All business data must exist inside Supabase PostgreSQL.

---

## Naming Conventions

### Tables

```sql id="0eb2gr"
snake_case
plural_names
```

### Columns

```sql id="y8j8m3"
snake_case
```

---

## Required Fields

Every table must include:

```sql id="4kdf9u"
id UUID PRIMARY KEY
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

## Foreign Keys Are Mandatory

Every relational field must use:

```sql id="1j8k0q"
REFERENCES
```

---

## Enums Over Free Text

Statuses must use enums.

Examples:

```sql id="4q9l7m"
lesson_status
booking_status
subscription_plan
```

---

## Migrations Only

All schema changes must go through:

```text id="i97k9l"
database/migrations/
```

No manual production edits.

---

# Core Database Entities

```text id="rg1n3s"
users
teacher_profiles
students
availability_slots
booking_requests
lessons
lesson_notes
conversations
messages
reviews
teacher_subscriptions
notifications
```

---

# API Standards

## Success Response

```json id="w0tyn2"
{
  "data": {}
}
```

## Error Response

```json id="w3e2do"
{
  "error": {
    "message": ""
  }
}
```

---

# Development Rules

Before building any feature, the following must exist:

* flow definition
* screen definition
* DB schema
* API contract
* business rules

If product logic is unclear:

* stop development
* do not invent behavior

---

# Environment Variables

```env id="r6tfy8"
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

DATABASE_URL=
```

---

# Run Frontend

```bash id="g40dr6"
cd apps/frontend
npm install
npm run dev
```

---

# Run Backend

```bash id="h6m5pi"
cd apps/backend
npm install
npm run dev
```

---

# Run Migrations

```bash id="jkqvlu"
npm run db:migrate
```

---

# Current Status

Current phase:

* architecture stabilization
* database infrastructure
* onboarding flows
* CRM foundation
* matchmaking MVP
