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
- API client placeholder
- Zustand store placeholder
- design token placeholder
- motion utility placeholder

No product screens or product workflows are implemented yet.

### Backend

`apps/backend` contains the Node + Express + TypeScript foundation:

- route/controller/service/repository structure
- `GET /health`
- central error handler
- request validation helper
- env config
- placeholder auth middleware

No product logic, database schema, lifecycle logic, or payment logic is implemented yet.

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

## Current Boundary

This foundation deliberately does not include:

- matching
- booking
- lessons
- CRM
- payments
- database schema
- Supabase migrations
- product dashboards
- mock product logic
