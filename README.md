# Friendly Mail

Friendly Mail is an AI workflow layer for Outlook. This repository contains the MVP workspace for the backend services, companion dashboard, Outlook add-in, and shared packages.

## Workspace Layout

- `apps/api` - backend service shell
- `apps/dashboard` - companion web dashboard shell
- `apps/outlook-addin` - Outlook add-in shell
- `packages/contracts` - shared domain contracts
- `packages/auth` - internal authentication and session utilities
- `packages/config` - environment and configuration helpers
- `packages/database` - Prisma client and audit write helpers
- `packages/graph` - Microsoft Graph connector with retry, pagination, and immutable-ID defaults
- `packages/observability` - structured logging and shared error handling
- `packages/queue` - Redis and BullMQ worker foundation

## Quick Start

1. Copy `.env.example` to `.env`.
2. Install dependencies with `npm install`.
3. Start local infrastructure with `docker compose up -d postgres redis`.
4. Generate the Prisma client with `npm run db:generate`.
5. Apply local migrations with `npm run db:migrate:deploy`.
6. Verify the schema and queue with `npm run db:validate` and `npm run queue:health`.
7. Start the services you need:
   - `npm run dev:api`
   - `npm run dev:dashboard`
   - `npm run dev:addin`
   - `npm run dev:worker`
8. Run `npm run verify` before pushing changes.

Useful dev commands:

- `npm run dev:api`
- `npm run dev:dashboard`
- `npm run dev:addin`
- `npm run dev:worker`
- `npm run db:migrate:deploy`
- `npm run db:validate`
- `npm run db:migrate:status`
- `npm run queue:health`
- `docker compose up -d postgres redis`

## Local Runbook

- Full onboarding and troubleshooting notes live in `docs/local-runbook.md`.
- The Epic 2 Microsoft Entra and Graph connectivity contract lives in `docs/graph-connectivity-contract.md`.
- The Outlook add-in manifest expects `https://localhost:4173`, and the local Vite config is now aligned to that dev URL.
- The current UI surfaces are still product shells; Graph onboarding, real mailbox sync, and user provisioning beyond the auth baseline are future work.

## Shared Contracts

- Shared product-domain types live in `@friendly-mail/contracts`.
- Package direction rules are documented in `docs/package-boundaries.md`.
- The current boundary baseline is enforced by `packages/contracts/src/package-boundaries.test.ts`.

## Current Scope

This repo currently implements the Epic 1 foundation slice:

- repository architecture
- environment and secrets baseline
- CI, lint, typecheck, and test defaults
- Prisma database and migration baseline
- Redis and BullMQ queue baseline
- structured logging, shared error handling, and audit write baseline
- internal auth and session baseline with explicit separation from future Microsoft Graph mailbox auth
- Microsoft Graph connector baseline for folders, messages, delta sync, and subscriptions
- delegated mailbox onboarding baseline with Microsoft authorization redirect and callback handling
- initial mailbox folder discovery and sync baseline with persisted folder trees and per-folder sync state seeding
- per-folder message metadata delta sync baseline with persisted delta links and Graph removal tracking
