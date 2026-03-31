# Friendly Mail

Friendly Mail is an AI workflow layer for Outlook. This repository contains the MVP workspace for the backend services, companion dashboard, Outlook add-in, and shared packages.

## Workspace Layout

- `apps/api` - backend service shell
- `apps/dashboard` - companion web dashboard shell
- `apps/outlook-addin` - Outlook add-in shell
- `packages/contracts` - shared domain contracts
- `packages/config` - environment and configuration helpers
- `packages/database` - Prisma client and audit write helpers
- `packages/observability` - structured logging and shared error handling
- `packages/queue` - Redis and BullMQ worker foundation

## Quick Start

1. Copy `.env.example` to `.env` and fill in the required values.
2. Install dependencies with `npm install`.
3. Generate the Prisma client with `npm run db:generate`.
4. Start local infrastructure with `docker compose up -d postgres redis`.
5. Check schema and migration status with `npm run db:validate` and `npm run db:migrate:status`.
6. Verify queue health with `npm run queue:health`.
7. Run `npm run verify`.

Useful dev commands:

- `npm run dev:api`
- `npm run dev:dashboard`
- `npm run dev:addin`
- `npm run dev:worker`
- `npm run db:validate`
- `npm run db:migrate:status`
- `npm run queue:health`
- `docker compose up -d postgres redis`

## Current Scope

This repo currently implements the Epic 1 foundation slice:

- repository architecture
- environment and secrets baseline
- CI, lint, typecheck, and test defaults
- Prisma database and migration baseline
- Redis and BullMQ queue baseline
- structured logging, shared error handling, and audit write baseline
