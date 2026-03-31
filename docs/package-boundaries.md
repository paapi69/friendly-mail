# Friendly Mail Package Boundaries

## Goal

Friendly Mail uses package boundaries to keep shared concepts stable and to prevent circular architecture drift as Epic 2 and later work begins.

## Direction Rules

- `apps/*` may depend on shared packages.
- `packages/contracts` is the lowest-level workspace package and must not depend on other Friendly Mail workspace packages.
- `packages/config`, `packages/auth`, `packages/database`, and `packages/observability` must not import from `apps/*`.
- `packages/queue` may depend on infrastructure-oriented shared packages such as config and observability, but not on app surfaces.
- Front-end surfaces should prefer `@friendly-mail/contracts` for product-domain vocabulary rather than recreating local enums or DTOs.
- Backend services may translate persistence-layer models into `@friendly-mail/contracts` types for data exchanged with surfaces.

## Current Baseline

- `@friendly-mail/contracts`: shared mailbox, message, filing, task, auth-session, and audit vocabulary
- `@friendly-mail/config`: runtime environment parsing
- `@friendly-mail/auth`: password hashing, session token, and cookie helpers
- `@friendly-mail/database`: Prisma client and persistence helpers
- `@friendly-mail/observability`: logger and error primitives
- `@friendly-mail/queue`: worker and queue infrastructure

## Why This Matters

- Mailbox state and workflow state are separate in Friendly Mail, so the domain language must be shared consistently across the API, dashboard, and Outlook add-in.
- Explicit package direction rules reduce the chance that UI code starts depending on persistence details or that infrastructure packages quietly pick up product-surface logic.
- The package-boundary test in `packages/contracts/src/package-boundaries.test.ts` is the enforcement backstop for this baseline.
