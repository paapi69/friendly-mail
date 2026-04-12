# Microsoft Tenant Setup Guide

## Document Control

- Product: Friendly Mail
- Document type: Operator setup guide
- Version: v0.1
- Status: Draft
- Date: 2026-04-06
- Related documents:
  - `.env.example`
  - `friendly-mail-technical-design.md`
  - `friendly-mail-epic-tickets.md`
  - `docs/graph-connectivity-contract.md`

## Purpose

This guide turns the Microsoft-side setup for Friendly Mail into a repeatable operator workflow.

It exists to answer one practical question clearly:

- what values must come from you or a Microsoft 365 administrator
- what values can be generated locally by the engineering side
- what order the Microsoft Entra, Graph, redirect URI, secret, and webhook steps should happen in

## What Comes From Your Side

Friendly Mail needs these operator-side inputs before the full Microsoft-backed flows can run end to end:

- a Microsoft Entra tenant where the app can be registered
- permission to create or manage an app registration in that tenant
- the tenant ID for the chosen tenant
- the application (client) ID for the Friendly Mail app registration
- a client secret or certificate strategy for the web backend
- approval of the delegated Microsoft Graph permission scope set
- any required user or administrator consent in that tenant
- a public HTTPS base URL for Graph webhook delivery when subscription flows are being tested
- at least one real mailbox to use for connection and verification
- confirmation of whether shared-mailbox testing is in scope for the current phase

## What Engineering Can Generate or Fill

These values do not need to come from the tenant administrator:

- `MICROSOFT_TOKEN_ENCRYPTION_KEY`
- local `VITE_API_BASE_URL`
- local redirect URI values that point at the current development backend
- the `.env` wiring once the Microsoft-side values are known
- the local Outlook add-in preview and API boot flow

## Environment Value Map

| Variable | Source | Example / Notes | Needed For |
|---|---|---|---|
| `MICROSOFT_TENANT_ID` | Microsoft tenant | Directory (tenant) ID from Entra app overview | All Microsoft auth flows |
| `MICROSOFT_CLIENT_ID` | App registration | Application (client) ID | All Microsoft auth flows |
| `MICROSOFT_CLIENT_SECRET` | App registration | Secret value created under Certificates & secrets | Token exchange on backend |
| `MICROSOFT_AUTHORITY_URL` | Repo default unless overridden | `https://login.microsoftonline.com/organizations` | Sign-in authority |
| `MICROSOFT_GRAPH_REDIRECT_URI` | Microsoft + repo | Local default is `http://localhost:4000/auth/microsoft/callback` | OAuth callback |
| `MICROSOFT_GRAPH_SCOPES` | Microsoft permissions choice | Minimum local baseline is in `.env.example`; full MVP may need wider scopes | Graph delegated access |
| `MICROSOFT_TOKEN_ENCRYPTION_KEY` | Engineering-generated secret | Generate locally or in secret manager; keep at least 32 chars | Token storage encryption |
| `MICROSOFT_WEBHOOK_BASE_URL` | Public app URL or tunnel | Example: `https://example.ngrok-free.app` | Graph subscriptions and webhook callbacks |
| `VITE_API_BASE_URL` | Frontend config | Local default: `http://localhost:4000` | Add-in and dashboard API calls |

## Recommended Scope Levels

### Minimum local connect and readiness baseline

Use this when the immediate goal is mailbox connection, sign-in, and readiness checks:

- `openid`
- `profile`
- `email`
- `offline_access`
- `User.Read`
- `Mail.Read`

This matches the current `.env.example` baseline.

### Full MVP mailbox-action baseline

Use this when you want to exercise filing, category changes, routing, or other mailbox-mutating MVP behavior:

- everything in the minimum baseline
- `Mail.ReadWrite`
- `Mail.Send`

### Shared or delegated send expansion

Add this only when shared or delegated send scenarios are intentionally in scope:

- `Mail.Send.Shared`

The technical design already notes that exact permission minimization should be finalized during tenant onboarding, so this should be an explicit choice rather than a default escalation.

## Step-by-Step Setup

### 1. Choose the Microsoft tenant and operator

Decide which Microsoft 365 tenant will host the Friendly Mail app registration.

You need:

- access to the target tenant
- a role capable of app registration work

Microsoft documents the least-privileged role for app registration as Cloud Application Administrator.

Reference:
- [Register an application with the Microsoft identity platform](https://learn.microsoft.com/en-us/graph/auth-register-app-v2)

### 2. Register the Friendly Mail app in Microsoft Entra

In the Microsoft Entra admin center:

1. Go to `Identity > Applications > App registrations`.
2. Create a new registration.
3. Use a recognizable name such as `Friendly Mail Local` or `Friendly Mail Pilot`.
4. Choose the supported account type that matches the current product decision.

Recommended current alignment:

- use `Accounts in any organizational directory` if you want to stay aligned with the repo's `organizations` authority setting

Capture and store:

- Directory (tenant) ID
- Application (client) ID

Reference:
- [Register an application with the Microsoft identity platform](https://learn.microsoft.com/en-us/graph/auth-register-app-v2)

### 3. Add the web redirect URI

Under `Authentication`, add the `Web` platform and configure the redirect URI.

For local development, use:

- `http://localhost:4000/auth/microsoft/callback`

Later environments should add their own callback URLs explicitly.

Examples:

- local: `http://localhost:4000/auth/microsoft/callback`
- staging: `https://staging.example.com/auth/microsoft/callback`
- production: `https://app.example.com/auth/microsoft/callback`

Reference:
- [Register an application with the Microsoft identity platform](https://learn.microsoft.com/en-us/graph/auth-register-app-v2)

### 4. Create a client secret

Under `Certificates & secrets`:

1. Create a new client secret.
2. Give it a clear description.
3. Record the secret value immediately.

For local development, a client secret is acceptable.
For production, Microsoft recommends stronger credential strategies such as certificates or federated credentials when practical.

Reference:
- [Register an application with the Microsoft identity platform](https://learn.microsoft.com/en-us/graph/auth-register-app-v2)

### 5. Add delegated Microsoft Graph permissions

Add the delegated permissions needed for the current Friendly Mail phase.

Start with:

- `openid`
- `profile`
- `email`
- `offline_access`
- `User.Read`
- `Mail.Read`

Add these when testing the full mailbox-action MVP:

- `Mail.ReadWrite`
- `Mail.Send`

Optional only when shared or delegated send is intended:

- `Mail.Send.Shared`

This guide treats delegated permissions as the current default because Friendly Mail's current onboarding flow is delegated-first.

Reference:
- [Overview of permissions and consent in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/permissions-consent-overview)

### 6. Handle user or admin consent

Consent requirements depend on:

- which delegated permissions are requested
- tenant policy
- whether an administrator wants to pre-consent for users

Working rule:

- basic delegated permissions may be user-consentable in some tenants
- broader or restricted permissions may require administrator consent
- for pilot stability, pre-consenting the final approved scope set is usually cleaner than relying on ad hoc user prompts

Reference:
- [Overview of permissions and consent in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/permissions-consent-overview)

### 7. Generate the local token encryption key

This key is not from Microsoft. It is a Friendly Mail backend secret.

You can generate one locally with Node:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Set the result as:

- `MICROSOFT_TOKEN_ENCRYPTION_KEY`

Keep it in a secret store for non-local environments.

### 8. Fill the local environment file

Create a local `.env` from `.env.example` and fill these values:

```text
MICROSOFT_TENANT_ID=<Directory tenant ID>
MICROSOFT_CLIENT_ID=<Application client ID>
MICROSOFT_CLIENT_SECRET=<client secret value>
MICROSOFT_GRAPH_REDIRECT_URI=http://localhost:4000/auth/microsoft/callback
MICROSOFT_GRAPH_SCOPES=openid profile email offline_access User.Read Mail.Read
MICROSOFT_TOKEN_ENCRYPTION_KEY=<generated local secret>
MICROSOFT_WEBHOOK_BASE_URL=<public https base URL or temporary placeholder>
VITE_API_BASE_URL=http://localhost:4000
```

If you are only booting the local API and not yet testing subscriptions, `MICROSOFT_WEBHOOK_BASE_URL` can be a temporary placeholder string. Replace it with a real public HTTPS URL before testing Graph subscriptions.

### 9. Expose a public HTTPS webhook URL

Graph webhook notifications require a public HTTPS endpoint.

For local testing, this usually means:

- `ngrok`
- `cloudflared`
- another HTTPS tunnel that forwards to the local API

Set:

- `MICROSOFT_WEBHOOK_BASE_URL`

to the public base URL of that tunnel or staging deployment.

Important Microsoft requirement:

- the webhook endpoint must be publicly reachable over HTTPS
- Graph validates the notification URL when the subscription is created

Reference:
- [Receive change notifications through webhooks](https://learn.microsoft.com/en-us/graph/change-notifications-delivery-webhooks)

### 10. Boot the local stack

Once the env vars are in place, start:

```powershell
npm run dev:api
npm run dev:addin
```

Expected local URLs:

- API: `http://localhost:4000`
- Outlook add-in preview: `https://localhost:4173`

### 11. Verify mailbox connect and readiness

Use the Outlook add-in or the API flow to verify:

1. the mailbox connect flow opens successfully
2. the OAuth callback completes
3. the mailbox record is created
4. mailbox readiness can be loaded

This proves that:

- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_GRAPH_REDIRECT_URI`
- `MICROSOFT_GRAPH_SCOPES`
- `MICROSOFT_TOKEN_ENCRYPTION_KEY`
- `VITE_API_BASE_URL`

are all wired correctly enough for delegated onboarding.

### 12. Verify Graph subscriptions and webhooks

After the local or staging public webhook URL is in place, verify:

1. a subscription can be created
2. Graph validation reaches the webhook endpoint
3. notification callbacks are accepted
4. subscription and notification health update correctly

This proves that:

- `MICROSOFT_WEBHOOK_BASE_URL`

is not only present, but usable by Microsoft Graph.

Reference:
- [Receive change notifications through webhooks](https://learn.microsoft.com/en-us/graph/change-notifications-delivery-webhooks)

## What To Send Back

When you finish the Microsoft-side setup, the minimum handoff back into the repo workflow is:

- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET` or the secret-manager location where it will be injected
- confirmed redirect URI list
- confirmed Graph delegated scope list
- whether admin consent has been granted
- `MICROSOFT_WEBHOOK_BASE_URL`
- at least one mailbox ID or mailbox email that should be used for real verification
- whether shared mailbox support is currently required

## Recommended Separation Of Responsibility

### From your side or tenant-admin side

- create or approve the app registration
- approve supported account type
- approve delegated permissions
- handle user or admin consent in the tenant
- provide or approve the public webhook base URL

### From engineering side

- generate the local token encryption key
- wire the env values into the repo
- validate the backend and add-in startup
- verify mailbox connect, readiness, and subscription behavior

## Current Friendly Mail Reality

As of this guide:

- the local API fails fast when these values are missing
- the Outlook add-in preview can run without them, but live mailbox readiness cannot
- webhook-backed Graph subscriptions are implemented in the backend and require a real public HTTPS callback URL before they can be verified end to end

## Sources

- [Register an application with the Microsoft identity platform](https://learn.microsoft.com/en-us/graph/auth-register-app-v2)
- [Overview of permissions and consent in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/permissions-consent-overview)
- [Receive change notifications through webhooks](https://learn.microsoft.com/en-us/graph/change-notifications-delivery-webhooks)
