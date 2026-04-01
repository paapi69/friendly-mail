# Friendly Mail Local Runbook

## Purpose

This runbook is the default onboarding path for working on Friendly Mail locally.

Use it when you need to:

- set up the repo on a new machine
- boot the API, dashboard, Outlook add-in shell, and worker
- validate the local database and queue foundations
- troubleshoot the most common startup failures

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop or another Docker runtime with Compose support
- A shell that can run the workspace commands from the repo root

## One-Time Setup

1. Install dependencies:

```bash
npm install
```

2. Create the local environment file:

```bash
Copy-Item .env.example .env
```

3. Start the local infrastructure:

```bash
docker compose up -d postgres redis
```

4. Generate the Prisma client:

```bash
npm run db:generate
```

5. Apply the checked-in migrations:

```bash
npm run db:migrate:deploy
```

6. Validate the schema and queue wiring:

```bash
npm run db:validate
npm run queue:health
```

7. Run the baseline verification suite:

```bash
npm run verify
```

## Environment Notes

The committed `.env.example` is the source of truth for local variables. The important local defaults are:

- `API_PORT=4000`
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/friendly_mail`
- `REDIS_URL=redis://localhost:6379`
- `QUEUE_URL=redis://localhost:6379`
- `VITE_API_BASE_URL=http://localhost:4000`
- `SESSION_COOKIE_NAME=friendly_mail_session`

Some Microsoft values remain placeholders until Epic 2:

- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_WEBHOOK_BASE_URL`

Those values are not required for the current local shells, but they should still exist in `.env` because the server config contract validates them.

## Workspace Layout

- `apps/api`: internal API shell and auth baseline
- `apps/dashboard`: companion web dashboard shell
- `apps/outlook-addin`: Outlook add-in shell
- `packages/contracts`: shared domain contracts
- `packages/auth`: internal auth and session helpers
- `packages/config`: env parsing
- `packages/database`: Prisma schema, client, and helpers
- `packages/observability`: logging and error primitives
- `packages/queue`: BullMQ worker and queue healthcheck

## Local Services and Ports

- Postgres: `localhost:5432`
- Redis: `localhost:6379`
- API: `http://localhost:4000`
- Dashboard dev server: `http://localhost:5173`
- Outlook add-in dev server: `https://localhost:4173`

## Daily Dev Start

Use separate terminals from the repo root:

### API

```bash
npm run dev:api
```

Expected result:

- API listens on `http://localhost:4000`
- `GET /health` returns a healthy JSON payload

### Dashboard

```bash
npm run dev:dashboard
```

Expected result:

- Vite serves the dashboard shell on `http://localhost:5173`

### Outlook Add-in Shell

```bash
npm run dev:addin
```

Expected result:

- Vite serves the add-in shell on `https://localhost:4173`
- The manifest in `apps/outlook-addin/manifest.xml` points to that URL

Current limitation:

- The add-in is still a shell. Real Microsoft Graph onboarding and Outlook production workflows are not wired yet.

### Worker

```bash
npm run dev:worker
```

Expected result:

- The queue worker starts and connects to Redis

## Verification Commands

- `npm run lint`: ESLint across the repo
- `npm run typecheck`: TypeScript checks for all workspaces
- `npm run test`: Vitest suite across packages and app tests
- `npm run build`: Production builds for API, dashboard, and add-in
- `npm run verify`: lint + typecheck + test
- `npm run db:validate`: Prisma schema validation
- `npm run db:migrate:status`: current migration state against the configured database
- `npm run queue:health`: Redis/BullMQ baseline connectivity check

## Current Product-Surface Reality

- The API includes the internal auth/session baseline, but user provisioning UX is not implemented yet.
- The dashboard and Outlook add-in are intentionally lightweight shells for now.
- Microsoft Graph connectivity, mailbox onboarding, sync, and webhook flows begin in Epic 2.
- Friendly Mail task state remains separate from mailbox state even in local scaffolding work.

## Troubleshooting

### Prisma client errors after schema changes

Symptoms:

- TypeScript cannot find Prisma enums or fields
- Runtime complains about a stale Prisma client

Fix:

```bash
npm run db:generate
```

### Database connection refused

Symptoms:

- `npm run db:validate` or API startup fails against Postgres

Fix:

```bash
docker compose up -d postgres
docker compose ps
```

If the container is healthy, re-check `DATABASE_URL` in `.env`.

### Redis or queue health failures

Symptoms:

- `npm run queue:health` fails
- Worker cannot connect

Fix:

```bash
docker compose up -d redis
docker compose ps
```

Then confirm `REDIS_URL` and `QUEUE_URL` point at `redis://localhost:6379`.

### Outlook add-in dev server or manifest mismatch

Symptoms:

- Outlook cannot load the add-in shell locally
- The manifest URL and dev server port do not line up

Fix:

- Use `npm run dev:addin`, not a generic Vite command
- Keep the add-in dev server on `https://localhost:4173`
- Sideload `apps/outlook-addin/manifest.xml` into Outlook only after the HTTPS dev server is running

### Port already in use

Symptoms:

- Vite or the API fails to start because the port is occupied

Common ports:

- `4000` for API
- `5173` for dashboard
- `4173` for add-in
- `5432` for Postgres
- `6379` for Redis

Fix the conflicting process or change the local port intentionally and update the relevant config or manifest at the same time.

## Recommended Workflow Before a Push

1. Run the service you are changing.
2. Run the most relevant focused check if you changed infrastructure or contracts.
3. Run `npm run verify`.
4. Run `npm run build` before publishing larger changes.

## Related Docs

- `README.md`
- `docs/auth-baseline.md`
- `docs/package-boundaries.md`
- `.planning/STATE.md`
- `session_summary.md`
