# PROJECT_STATE.md

## Repo
- Name: `syndicate-portal`
- Root: `/home/cory/Documents/BUSINESS_OPERATIONS_FABRIC/syndicate-portal`
- Public URL: `voice.syndicateai.co` (operator-verified live in browser on 2026-04-10)
- Deploy target: unknown
- GitHub remote: unknown

## Production Status
- Implemented locally:
  - login/session flow
  - dashboard page (`/portal/dashboard` via BFF)
  - business profile page (`/portal/business-profile` via BFF)
  - agent mode read/update (`/portal/agent-mode` via BFF)
  - audit log table (`/portal/audit-log` via BFF)
  - internal admin route for tenant bootstrap + owner onboarding invite (`/internal-admin`)
  - first-login activation page (`/activate`) with signed invite token validation
  - billing/documents customer surface (`/billing`)
  - persistent tenant onboarding/billing state model and admin controls
  - plan mapping integration from `../legal-docs/Syndicate-Stripe-Prod-Ids.md`
- Operator-verified live on 2026-04-10:
  - portal loads at `https://voice.syndicateai.co`
  - admin navigation tabs are visible again for the admin account
  - `/internal-admin` loads again in production
  - onboarding state area and Stripe mapping area are visible in production
- Still not verified from this repo alone:
  - DNS/reverse proxy cutover internals

## Deploy Reality
- Local build verification on 2026-04-10:
  - `npm run test` passed (19 tests)
  - `npm run build` passed
- Live redeploy verification on 2026-04-10:
  - VM pulled portal changes and rebuilt the Next app
  - operator confirmed admin tabs returned in the live site after rebuild
- Runtime artifact identifiers: not tracked in this repo yet.

## IMPORTANT STATE - DO NOT LOSE THIS CONTEXT
- The major blocker from 2026-04-09/2026-04-10 was that `Audit Log` and `Internal Admin` disappeared for the operator admin account.
- That blocker is now cleared in the live portal.
- Current operator-visible state after live rebuild:
  - `Audit Log` tab is back
  - `Internal Admin` tab is back
  - internal admin page is accessible and usable again
- This means the operator can now resume the intended manual close/onboarding workflow:
  - create tenant in `/internal-admin`
  - send agreement manually via the chosen provider
  - send Stripe payment link for deposit/final setup
  - send portal invite
  - validate in a separate client session that admin tabs remain hidden and customer payment screens remain visible
- Today’s most important next verification is not admin visibility anymore; it is full manual onboarding flow validation end to end.

## Repo Alignment Status
- Local working tree has implementation changes for initial v1 scaffold.
- Branch/merge/push state: unknown (no git metadata available in parent workspace).

## Dependencies
- VoiceOps API (separate repo/service) for auth and portal endpoint substrate.
- Endpoint base URL configured by `VOICEOPS_API_BASE_URL`.

## Remaining Gaps
- Business profile write (`PUT /api/v1/portal/business-profile`) not implemented in UI/BFF.
- Password activation requires `VOICEOPS_PASSWORD_RESET_PATH` to match an active VoiceOps endpoint.
- Billing status can be updated manually and via Stripe webhook ingestion (`/api/webhooks/stripe`) when webhook/env are configured correctly.
- Role mapping is basic (`owner`/`admin` editable for agent mode; others read-only).
- Live VoiceOps auth payload shape is still externally owned, so portal RBAC depends on `/api/v1/auth/me` continuing to provide either `role` or `is_platform_admin`.
- Agreement handling is still manual; provider automation/webhook/polling is not implemented yet.
- End-to-end tenant onboarding still needs live validation after tenant creation and invite delivery.
- Additional portal modules deferred:
  - team
  - summaries
  - escalation contacts
  - call settings

## Key Files
- `app/api/portal/*/route.ts`
- `app/api/session/*/route.ts`
- `lib/client/api.ts`
- `lib/types/portal.ts`
- `middleware.ts`
- `app/dashboard/page.tsx`
- `app/business-profile/page.tsx`
- `app/agent-mode/page.tsx`
- `app/audit-log/page.tsx`
- `app/internal-admin/page.tsx`
- `app/billing/page.tsx`
- `app/api/admin/onboarding-state/route.ts`
- `app/api/portal/billing-documents/route.ts`
- `lib/server/billing-state-store.ts`
- `lib/server/stripe-plan-map.ts`
- `RUNBOOK.md`

## Next Steps
1. Run the live manual onboarding flow end to end against a test tenant: create tenant, send the agreement manually, send payment link, open invite in separate client session, and confirm client-safe visibility.
2. Validate a full agreement-provider -> Stripe -> state update run against one real test tenant.
3. Add agreement-provider webhook or API polling to auto-update agreement status and signed document links.
