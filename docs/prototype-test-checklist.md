# Prototype Test Checklist

Use this checklist when preparing a real Microsoft mailbox for Friendly Mail prototype testing.

## First Decision

- Use a Microsoft 365 work or school mailbox, not a personal `@outlook.com` or `@hotmail.com` mailbox.
- If you do not already have a Microsoft 365 tenant, use a Microsoft 365 Developer Program sandbox.

## What You Need Before Testing

- A test mailbox that can sign in to Outlook and has an Exchange Online mailbox.
- Access to the Microsoft Entra admin center for the tenant that owns that mailbox.
- An app registration for Friendly Mail in that tenant.
- The app's:
  - Application (client) ID
  - Directory (tenant) ID
  - Client secret value
- A registered web redirect URI that matches the Friendly Mail callback URL.
- Microsoft Graph delegated permissions for:
  - `User.Read`
  - `Mail.Read`
  - `offline_access`
  - `openid`
  - `profile`
  - `email`
- Consent for those permissions in the tenant.

## Needed Later For Webhook Testing

- A public HTTPS URL that can reach the local API during development.
- A webhook tunnel tool such as `ngrok` or Cloudflare Tunnel.

## Where To Find Each Microsoft Value

### Application (client) ID

- Microsoft Entra admin center
- `App registrations` -> your app -> `Overview`

### Directory (tenant) ID

- Microsoft Entra admin center
- `App registrations` -> your app -> `Overview`

### Client secret

- Microsoft Entra admin center
- `App registrations` -> your app -> `Certificates & secrets`
- Create a new client secret and copy the **Value** when it is shown

### Redirect URI

- Microsoft Entra admin center
- `App registrations` -> your app -> `Authentication`
- Add a `Web` platform redirect URI that matches Friendly Mail exactly
- Current local callback in this repo: `http://localhost:4000/auth/microsoft/callback`

### Graph permissions

- Microsoft Entra admin center
- `App registrations` -> your app -> `API permissions`
- Add delegated Microsoft Graph permissions

### Consent

- Usually in the same `API permissions` page
- If the tenant blocks normal user consent, a tenant admin must grant consent

## What Friendly Mail Can Do Versus What You Must Do

### You Must Provide Or Set Up

- The mailbox and tenant
- The Microsoft app registration
- The Entra IDs and client secret
- The redirect URI
- The Graph permission consent
- The public webhook URL when webhook testing starts

### Friendly Mail Already Handles

- The local callback endpoint
- The authorization-code exchange flow
- Mailbox validation
- Folder discovery
- Message metadata sync

## Recommended Easiest Path

1. Get a Microsoft 365 Developer Program sandbox if you do not already have a Microsoft 365 work tenant.
2. Create one app registration inside that tenant.
3. Add the callback URL and delegated Graph permissions.
4. Put the copied values into `.env`.
5. Test mailbox connect and sync locally.
6. Add a tunnel URL later when webhook work begins.
