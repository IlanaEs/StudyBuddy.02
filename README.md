# StudyBuddy.02

StudyBuddy.02 is a CRM-driven matchmaking operating system for private education.

This repository currently contains the technical foundation only. Product features are intentionally not implemented yet.

## Monorepo Structure

```text
apps/
  frontend/
  backend/

agents/
docs/
packages/
```

## Apps

### Frontend

`apps/frontend` contains the React + Vite + TypeScript foundation:

- Tailwind CSS
- React Router
- app shell placeholder
- API client with authenticated request support
- Supabase Auth provider foundation
- protected route foundation
- Zustand store placeholder
- design token placeholder
- motion utility placeholder

No product screens or product workflows are implemented yet.

### Backend

`apps/backend` contains the Node + Express + TypeScript foundation:

- route/controller/service/repository structure
- `GET /health`
- Supabase Auth endpoints under `/auth`
- central error handler
- request validation helper
- env config
- JWT auth middleware backed by Supabase Auth

No product workflow logic, lifecycle automation, or payment logic is implemented yet.

## Setup

```bash
npm install
```

## Development

Run both apps:

```bash
npm run dev
```

Run only the frontend:

```bash
npm run dev:frontend
```

Run only the backend:

```bash
npm run dev:backend
```

Default local ports:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- Health: `http://localhost:4000/health`

## Validation

```bash
npm run build
npm run lint
npm run typecheck
npm run test
npm run db:validate
```

## Environment

Copy env examples before running locally:

```bash
cp .env.example .env
cp apps/frontend/.env.example apps/frontend/.env
cp apps/backend/.env.example apps/backend/.env
```

## Governance

Agent and architecture source-of-truth documents live in `agents/`.

Implementation must stay aligned with:

- `agents/00_AGENTS.md`
- `agents/09_Codex_Task_Template.md`
- `agents/02_System_Architect_Agent.md`
- `agents/05_Frontend_Agent.md`
- `agents/06_Backend_Agent.md`
- `agents/07_Supabase_Data_Agent.md`
- `agents/API_Contracts.md`

## Supabase

Supabase foundation migrations live in `supabase/migrations/`.

The current migration set creates the approved MVP schema only:

- enums and common helpers
- core users/students/teachers tables
- matching, booking, and lesson tables
- CRM, chat metadata, notifications, and admin metadata
- RLS starter policies
- Supabase Auth link from `public.users.supabase_auth_user_id` to `auth.users.id`

No production secrets are committed. Use the placeholders in `.env.example` and
`apps/backend/.env.example`.

## Auth Foundation

Supabase Auth is the only authentication source of truth.

Foundation endpoints:

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

The backend verifies Supabase access tokens, resolves the synchronized local
`users` row, and exposes a safe authenticated request context. The frontend
waits for session verification before rendering protected routes.

## Current Boundary

This foundation deliberately does not include:

- matching
- booking
- lessons
- CRM
- payments
- additional database schema beyond the approved MVP foundation
- product dashboards
- mock product logic
