# Friendly Mail Auth Baseline

## Purpose

Epic `E1-T7` establishes Friendly Mail's internal product authentication before Microsoft Graph mailbox onboarding begins.

## Core Separation

- Product auth answers: "Who can use Friendly Mail?"
- Microsoft Graph auth answers: "Which mailbox can Friendly Mail access or act on?"

These are intentionally separate.

- A user can hold a Friendly Mail session before any mailbox is connected.
- A tenant can grant mailbox permissions later without redefining product identity.
- Session state must never be treated as proof of mailbox consent.

## Baseline Model

- `User` is the internal application identity.
- `TenantMembership` grants tenant-scoped access and role.
- `Session` is a server-side, opaque, revocable session record.
- `Mailbox` remains a separate entity tied to Microsoft Graph onboarding work in Epic 2.

## Session Strategy

- Sessions use opaque random tokens stored as `httpOnly` cookies for the web dashboard baseline.
- Tokens are HMAC-hashed with `SESSION_SECRET` before database storage.
- Session records are revocable and expiry-based.
- API auth reads bearer tokens first, then the session cookie. This gives us room for Outlook add-in bootstrapping later without changing the session model.

## Outlook Add-in Implication

The Outlook add-in should not be treated as a plain browser tab. Microsoft recommends nested app authentication (NAA) and MSAL for delegated user identity in add-ins, and legacy Exchange identity tokens are no longer supported for Microsoft 365 tenants. Friendly Mail will use that Microsoft identity later to exchange into the internal session model defined here, instead of mixing Graph auth and product auth into one layer.

References:

- [Nested app authentication FAQ](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/faq-nested-app-auth-outlook-legacy-tokens)
- [Outlook add-ins overview](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/)
