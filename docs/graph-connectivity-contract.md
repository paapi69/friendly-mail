# Friendly Mail Microsoft Graph Connectivity Contract

## Purpose

Epic `E2-T1` defines the mailbox-connectivity contract for Friendly Mail before Epic 2 implementation begins.

This document locks the authentication boundary, onboarding flow, Microsoft Entra configuration shape, Graph permission model, and shared-mailbox fallback behavior that later Epic 2 tickets will build on.

## Product and Architecture Invariants

- Friendly Mail product identity stays separate from Microsoft Graph mailbox identity.
- Microsoft Graph is the mailbox source of truth.
- Friendly Mail's internal database remains the workflow source of truth.
- Epic 2 is delegated-first for a signed-in user's primary mailbox.
- Shared mailbox support remains inside Epic 2, but not as the first supported end-to-end mailbox-connect path.
- Immutable Graph message IDs are mandatory from day one.

## Contract Summary

Friendly Mail will support one mailbox-connect path first:

1. The user already has a Friendly Mail product session.
2. The user initiates mailbox connection from the Outlook add-in or dashboard.
3. The client uses Microsoft identity for user sign-in and consent.
4. Friendly Mail completes a backend-owned delegated OAuth flow and stores encrypted mailbox-consent metadata for background sync.
5. Friendly Mail registers the mailbox internally, verifies the mailbox is supported, and then starts folder and message synchronization.

This means:

- product session auth is never treated as proof of Graph consent
- Graph mailbox consent is never treated as product authorization
- the add-in can initiate sign-in, but background sync cannot depend on a short-lived client-side token alone

## Supported Mailbox Modes

### Supported First

- Microsoft 365 work or school accounts in Exchange Online
- the signed-in user's primary mailbox
- delegated Graph access for read-first mailbox onboarding and sync

### Explicitly Deferred from the First Runnable Slice

- shared mailbox change tracking as a primary onboarding path
- delegated-folder subscriptions for shared mailboxes
- in-place archive mailboxes
- personal Microsoft accounts
- on-premises Exchange

## Authentication Boundary

### Friendly Mail Product Auth

Friendly Mail product auth answers:

- who can sign in to Friendly Mail
- which tenant they belong to
- what internal role they have

Friendly Mail product auth continues to use the existing internal `User`, `TenantMembership`, and `Session` model.

### Microsoft Graph Mailbox Auth

Microsoft Graph mailbox auth answers:

- which Microsoft 365 tenant the mailbox belongs to
- which mailbox the user has consented to connect
- which Graph scopes and mailbox capabilities are available
- whether the system can safely perform background sync and subscriptions

### Required Separation

- A Friendly Mail session must not be accepted as mailbox consent.
- A Microsoft ID token must not be used to authorize Friendly Mail backend APIs by itself.
- The client must request an access token for Friendly Mail's own API when it needs to call the backend on behalf of the user.
- Graph access and refresh material must be stored server-side in encrypted form, not in browser storage as the durable source for background work.

## Chosen Surface Strategy

### Outlook Add-in

The Outlook add-in is the primary user surface, so Outlook sign-in must follow the current Microsoft add-in guidance:

- use MSAL with nested app authentication (NAA)
- do not rely on legacy Exchange Online identity or callback tokens
- be prepared to fall back to browser or dialog-based auth where NAA support is unavailable

### Companion Web App

The dashboard remains a valid place to complete or recover mailbox onboarding because it can host a normal redirect-based auth flow more easily than the add-in task pane.

### Friendly Mail Decision

Friendly Mail will allow mailbox connect to start from either surface, but the durable mailbox connection is owned by the backend so that Epic 2 can support:

- background delta sync
- subscription renewal
- lifecycle notification handling
- operational reauthorization

## Microsoft Entra App Registration Contract

Friendly Mail will use a Microsoft Entra application registration that supports:

- organizational Microsoft 365 tenants only
- SPA-style client redirects for add-in and web-based interactive sign-in
- backend confidential-client behavior for secure token exchange and durable delegated access

### Required Registration Characteristics

- Supported account types: `Accounts in any organizational directory`
- The app must expose a protected Friendly Mail API scope for client-to-backend calls.
- The app must be configured for delegated Microsoft Graph access.
- The app must support backend confidential-client flows with a client secret or certificate.

### Required Redirects

Friendly Mail should reserve redirect URIs for:

- Outlook add-in NAA broker redirect
- Outlook add-in fallback auth page
- Outlook add-in dialog fallback page
- dashboard or backend callback endpoint for durable mailbox onboarding

For local development, these redirects should align with the local add-in host and dashboard URLs already used in the repo.

## Graph Permission Contract

### MVP Initial Delegated Scope Set

The initial delegated scope set for Epic 2 should be:

- `openid`
- `profile`
- `email`
- `offline_access`
- `User.Read`
- `Mail.Read`

This is the minimum validated scope baseline for:

- identifying the signed-in Microsoft user
- discovering the user's primary mailbox
- reading folders and messages
- running folder and message synchronization
- creating message subscriptions for the supported delegated-primary-mailbox path

### Explicitly Not Required for E2-T1 Through E2-T8

These scopes are intentionally not part of the first mailbox-connect contract:

- `Mail.ReadWrite`
- `Mail.Send`
- `Mail.Send.Shared`

Those belong to later mailbox-mutating and send flows after Epic 2 proves safe mailbox connectivity.

### Shared-Mailbox Readiness Scopes

Shared or delegated folders can be read with delegated shared-mailbox scopes, but Microsoft documents an important limit: delegated shared-folder permissions do not support change-notification subscriptions on shared or delegated folders.

Because Epic 2 depends on webhook plus delta reconciliation, Friendly Mail will not treat delegated shared-folder access as equivalent to a fully supported shared-mailbox connectivity mode.

## Immutable ID Contract

Friendly Mail must send `Prefer: IdType="ImmutableId"` on every supported message request path used in Epic 2, including:

- message reads
- message list calls
- folder message delta queries
- subscription creation for supported Outlook message resources

Reasons:

- default Graph message IDs change when a message is moved
- Friendly Mail's later filing behavior moves messages as part of workflow completion
- internal task links and audit history must survive folder moves inside the same mailbox

This contract does not apply to folder IDs because mail folder identifiers are already stable enough without immutable-ID support.

## Mailbox Onboarding Contract

### First Supported Onboarding Path

The first supported mailbox-connect path is:

1. The user signs in to Friendly Mail.
2. The user chooses `Connect mailbox`.
3. Friendly Mail acquires Microsoft identity and delegated Graph consent.
4. The backend resolves the home tenant and mailbox identity.
5. Friendly Mail validates that the mailbox is an Exchange Online primary mailbox.
6. Friendly Mail persists mailbox linkage, delegated token metadata, and onboarding status.
7. Friendly Mail starts folder discovery and sync.

### Required Onboarding Checks

- the user has a valid Friendly Mail session
- Microsoft sign-in succeeds for an organizational account
- delegated Graph consent includes the minimum Epic 2 scope set
- the mailbox is reachable through Microsoft Graph
- the mailbox is not an archive mailbox
- the tenant and mailbox identifiers can be persisted internally

### Failure States That Must Be Explicit

- user has a product session but no Graph consent
- Microsoft sign-in succeeded but Graph scope consent is incomplete
- mailbox is reachable but unsupported for the current Epic 2 path
- tenant policy or Conditional Access blocks the add-in auth path
- webhook URL is not publicly reachable or cannot validate

## Shared Mailbox Readiness Contract

Shared mailboxes stay in Epic 2, but only as a readiness and capability-check stream until the delegated-primary path is stable.

### What Friendly Mail Will Support in E2-T1

- explicit capability checks for shared-mailbox scenarios
- a clear unsupported or limited-support result at onboarding time
- documentation of the permission gap between delegated shared-folder reads and subscription-backed sync

### What Friendly Mail Will Not Claim Yet

- that delegated `Mail.Read.Shared` or `Mail.ReadWrite.Shared` is enough for full shared-mailbox eventing
- that a shared mailbox can be onboarded with the same guarantees as a user's primary mailbox
- that mailbox send or write behavior is ready for shared mailbox workflows

### Current Product Decision

Inference from Microsoft's documentation:

- delegated shared-folder permissions are useful for readiness checks and manual reads
- a production-grade shared-mailbox connectivity path with webhook-backed sync will likely require a separate application-permission design and admin-consent path

That fuller shared-mailbox path belongs later in Epic 2, not in the first runnable slice.

## Webhook and Subscription Contract

Friendly Mail's webhook design for Epic 2 must assume:

- `notificationUrl` and `lifecycleNotificationUrl` are public HTTPS endpoints
- Microsoft Graph validates both endpoints during subscription setup
- validation requires returning the plain-text decoded validation token with `HTTP 200 OK`
- operational notifications should be acknowledged quickly and handed off to the queue
- lifecycle notifications must trigger reauthorization, recreation, or delta-based repair as appropriate

Friendly Mail must also assume that missed, removed, or reauthorization-required lifecycle events are normal operating conditions, not exceptional edge cases.

## Environment and Configuration Contract

### Current Required Environment Values

The existing Epic 1 environment baseline already contains the minimum server-side placeholders needed to begin Epic 2:

- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_WEBHOOK_BASE_URL`

### Additional Epic 2 Configuration That Must Exist Before Full Onboarding

Before E2-T4 and E2-T7 are fully wired, Friendly Mail must also have explicit values for:

- the Microsoft authority used for organizational sign-in
- the Friendly Mail API audience or exposed scope used by the client
- the interactive Graph scope set requested by the client
- the add-in NAA broker redirect URI
- add-in fallback redirect URIs
- the backend callback URI used for durable mailbox onboarding
- webhook lifecycle endpoint routing

Friendly Mail does not need all of these wired into runtime code in E2-T1, but they are part of the agreed connectivity contract and cannot stay implicit.

## Security Requirements

- No Microsoft secrets, tokens, or raw consent artifacts may be logged.
- Durable Graph token material must be encrypted at rest.
- Client-side identity tokens are not a substitute for backend authorization.
- Any backend endpoint that accepts Microsoft-issued access tokens must validate audience, issuer, tenant context, and expiry.
- Shared-mailbox capability checks must fail closed when required grants are absent.
- Webhook handlers must validate authenticity and queue work before expensive processing.

## Operational Notes

- Conditional Access can break add-in token acquisition flows; the deprecated approved-client-app grant is not a supported basis for Friendly Mail.
- Subscription renewal and lifecycle handling must be treated as first-class operational behavior.
- Delta sync remains the durable reconciliation path even when webhook delivery is healthy.

## Epic 2 Output of This Contract

This ticket is complete when later Epic 2 work can proceed without re-deciding:

- delegated versus shared-mailbox-first rollout
- where Graph consent lives
- whether immutable IDs are optional
- whether product auth and mailbox auth can be merged
- whether delegated shared-mailbox reads imply supported webhook-based sync

## References

Official Microsoft sources used for this contract:

- [Enable single sign-on in an Office add-in with nested app authentication](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/enable-nested-app-authentication-in-your-add-in)
- [Nested app authentication FAQ](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/faq-nested-app-auth-outlook-legacy-tokens)
- [Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference)
- [Get Outlook messages in a shared or delegated folder](https://learn.microsoft.com/en-us/graph/outlook-share-messages-folders)
- [Obtain immutable identifiers for Outlook resources](https://learn.microsoft.com/en-us/graph/outlook-immutable-id)
- [Get incremental changes to messages in a folder](https://learn.microsoft.com/en-us/graph/delta-query-messages)
- [Change notifications for Outlook resources](https://learn.microsoft.com/en-us/graph/outlook-change-notifications-overview)
- [Receive change notifications through webhooks](https://learn.microsoft.com/en-us/graph/change-notifications-delivery-webhooks)
- [Reduce missing change notifications and removed subscriptions](https://learn.microsoft.com/en-us/graph/change-notifications-lifecycle-events)
- [Send Outlook messages from another user using the Outlook mail API](https://learn.microsoft.com/en-us/graph/outlook-send-mail-from-other-user)
