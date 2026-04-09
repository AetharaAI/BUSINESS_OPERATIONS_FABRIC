# Syndicate Portal v1 Runbook

## Purpose
Customer-facing portal at `voice.syndicateai.co` using a portal app + BFF pattern that proxies only approved tenant-safe VoiceOps endpoints.

## Prerequisites
1. Node.js 20+
2. npm 10+
3. Reachable VoiceOps API base URL (example: `https://voice.aetherpro.us`)

## Environment
1. Copy `.env.example` to `.env.local`.
2. Set `VOICEOPS_API_BASE_URL` to the target VoiceOps environment.
3. For local HTTP dev, keep `PORTAL_COOKIE_SECURE=false`.

## Local Development
1. `cd syndicate-portal`
2. `npm install`
3. `npm run dev`
4. Open `http://localhost:3100/login`

## Production Build
1. `cd syndicate-portal`
2. `npm ci`
3. `npm run build`
4. `npm run start` (defaults to port `3100`, override with `PORT=<port> npm run start`)

## Deploy Notes
1. Deploy portal as a separate app/service from VoiceOps.
2. Route `voice.syndicateai.co` to this portal app.
3. Keep VoiceOps hosted separately (or same VM via reverse proxy) and private behind `VOICEOPS_API_BASE_URL`.
4. Ensure TLS is enabled and set `PORTAL_COOKIE_SECURE=true` in production.

## Security Controls
1. Browser calls only this app's `/api/*` BFF routes.
2. BFF proxies only:
   - `POST /api/v1/auth/login`
   - `GET /api/v1/auth/me`
   - `POST /api/v1/auth/forgot-password`
   - `POST /api/v1/auth/reset-password`
   - `POST /api/v1/auth/change-password`
   - `GET /api/v1/portal/dashboard`
   - `GET /api/v1/portal/business-profile`
   - `GET /api/v1/portal/agent-mode`
   - `PUT /api/v1/portal/agent-mode`
   - `GET /api/v1/portal/audit-log`
3. Admin/bootstrap/webhook endpoints are not exposed in browser code.
4. Session token is stored in HTTP-only cookie (`syndicate_portal_session`).

## Password Flows
1. Public forgot-password page: `/forgot-password`
   - submits email to `POST /api/session/forgot-password` (BFF -> VoiceOps `POST /api/v1/auth/forgot-password`)
   - UI always shows neutral success text and never reveals account existence
2. Public reset page: `/reset-password?token=...`
   - submits token + new password to `POST /api/session/reset-password` (BFF -> VoiceOps `POST /api/v1/auth/reset-password`)
3. Authenticated change-password page: `/change-password`
   - submits current/new password to `POST /api/session/change-password` (BFF -> VoiceOps `POST /api/v1/auth/change-password`)
4. Optional server-only header support for forgot-password:
   - if `VOICEOPS_PLATFORM_ADMIN_KEY` is set, BFF includes `x-platform-admin-key` server-side
   - this key is never exposed to the browser

## Internal Admin + Onboarding
1. Internal admin route: `/internal-admin` (authenticated session role must be `admin`).
2. Tenant bootstrap API: `POST /api/admin/tenant-bootstrap`
   - creates tenant via VoiceOps `POST /api/v1/tenants`
   - bootstraps owner via VoiceOps `POST /api/v1/auth/bootstrap`
   - returns temporary password + signed activation link
3. First-login activation page: `/activate?token=...`
4. Activation API: `POST /api/admin/activate-invite`
   - validates signed invite token
   - calls VoiceOps password reset path configured by `VOICEOPS_PASSWORD_RESET_PATH`
5. Required env for onboarding:
   - `VOICEOPS_PLATFORM_ADMIN_KEY`
   - `PORTAL_INVITE_TOKEN_SECRET`
   - `VOICEOPS_PASSWORD_RESET_PATH`
## Billing Scaffold
1. Billing route: `/billing`
2. Internal onboarding state API: `GET|POST|PUT /api/admin/onboarding-state`
3. Customer billing/documents API: `GET /api/portal/billing-documents`
4. Stripe mapping source of truth:
   - `../legal-docs/Syndicate-Stripe-Prod-Ids.md`
5. Runtime persistence:
   - `data/tenant-billing-state.json` (schema versioned local state file)
6. Configure:
   - `PORTAL_BILLING_PROVIDER`
   - `PORTAL_BILLING_MANAGE_URL_TEMPLATE` (supports `{tenant_id}` placeholder)
7. Plan mapping behavior:
   - `starter` and `growth` auto-populate deposit/final/monthly IDs and links from mapping doc
   - `operator` keeps setup/custom billing manual; monthly price reference only
8. Stripe webhook endpoint:
   - `POST /api/webhooks/stripe`
   - configure in Stripe as `https://voice.syndicateai.co/api/webhooks/stripe`
   - required env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - handled events:
     - `checkout.session.completed`
     - `invoice.paid`
     - `invoice.payment_failed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

## Operational Flow (First Customers)
1. Close the customer.
2. Send DocuSign manually and set agreement state in `/internal-admin`.
3. Copy/send deposit payment link from `/internal-admin`.
4. Mark deposit state `paid` after Stripe confirmation.
5. Send portal invite and set invite status `sent`.
6. Before go-live, copy/send final setup balance link and track status.
7. Track monthly state (`inactive` -> `pending` -> `active`) for later subscription automation.

## Test Commands
1. `npm run test`

## Branding Assets
1. Source logos are stored in `/logos` at the repo root.
2. Portal-ready assets are stored in `public/branding`:
   - `syndicate-logo-transparent-source.png` (RGBA source used for UI/icon generation)
   - `syndicate-logo-black-bg-source.png` (alternate source with black background)
   - `syndicate-logo-transparent-512.png`
   - `syndicate-logo-transparent-256.png`
   - `syndicate-logo-transparent-192.png`
3. App icons/favicons are generated in `app/`:
   - `favicon.ico`
   - `icon.png`
   - `apple-icon.png`
4. Regeneration command pattern:
   - `convert <source.png> -resize <size>x<size> <output.png>`

## Known Gaps
1. Session hardening enhancements pending (token refresh, idle timeout policy).
2. Role mapping currently uses VoiceOps role strings (`owner`/`admin` editable, others read-only for mode changes).
3. Business profile is view-only in v1 implementation.
4. Future portal modules are intentionally hidden with TODO markers:
   - Team
   - Summaries
   - Escalation contacts
   - Call settings
