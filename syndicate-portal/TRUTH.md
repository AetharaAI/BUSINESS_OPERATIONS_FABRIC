# TRUTH.md

## Identity
- Project name: Syndicate Portal (`syndicate-portal`)
- Purpose: Customer-facing portal + BFF for tenant-safe VoiceOps controls
- Frontend repo: this repo (`/home/cory/Aether-Admin-Platform/BUSINESS_OPERATIONS_FABRIC/syndicate-portal`)
- Backend repo: VoiceOps (separate repo, not modified here)

## Runtime
- Public URL: `https://voice.syndicateai.co` (operator-verified live in browser on 2026-04-10)
- API URL: configured by `VOICEOPS_API_BASE_URL`
- Live VM production truth as of `2026-06-30`: the portal must use the local VoiceOps backend URL `http://127.0.0.1:8102` on `b3-32-us-west-or-1`; using the public `https://voice.aetherpro.us` hostname from the same VM routes back through the hardened nginx gate and breaks portal server-side auth calls
- Repo root: `/home/cory/Aether-Admin-Platform/BUSINESS_OPERATIONS_FABRIC/syndicate-portal`
- Deploy path: `/home/cory/aether/planes/voice/portal/syndicate-portal`

## Infra
- Provider: unknown
- Region: unknown
- Instance type: unknown
- Tailscale IP: `100.92.18.20`

## Current Production Truth
- Verified local implementation exists for v1 scope:
  - auth/session flow
  - dashboard
  - business profile (view)
  - agent mode read/update with enforcement-pending warning support
  - audit log table
- internal admin RBAC now resolves from VoiceOps session role/flag (`role=admin` or `is_platform_admin=true`)
- local delegated workforce overlay now exists for scoped internal onboarding sessions using `PORTAL_WORKFORCE_DIRECTORY_JSON`
- local CRM data plane now exists in Postgres under the `bof_crm` schema with RLS enforced by per-transaction GUCs
- Verified locally on 2026-04-10:
  - `npm run test` passed
  - `npm run build` passed
- Verified locally on 2026-07-16:
  - `npm test` passed (`25` tests)
  - `npm run build` passed
  - scoped workforce onboarding routes and UI compiled successfully
  - `drizzle/0000_low_changeling.sql` applied successfully
  - `npm test` passed (`29` tests) after the CRM data-plane slice
  - RLS negative proof passed against the real `syndicate` Postgres database
  - CRM routes and PandaDoc webhook scaffold compiled successfully
- Verified locally on 2026-07-18:
  - `npm test -- billing-state-store.test.ts stripe-webhook-bridge.test.ts workforce-receipts.test.ts` passed
  - `npm run build` passed
- Verified locally on 2026-07-22:
  - exact Starter and Growth Stripe mappings remain the approved values from `legal-docs/Syndicate-Stripe-Prod-Ids.md`
  - `GET|POST|PUT /api/admin/website-provisioning` compiled and passed targeted tests
  - `/internal-admin` now includes an operator-facing AI website post-close handoff panel
  - `npm test -- tests/billing-state-store.test.ts tests/stripe-webhook-bridge.test.ts tests/website-provisioning.test.ts` passed
  - `npm run build` passed
- Verified live on 2026-07-18:
  - BOF emits canonical event metadata to RedWatch via `POST https://api.redwatch.us/v1/evidence`
  - BOF stores the returned RedWatch `evidence_id` as a bridge reference and does not compute receipt-chain fields locally
- Verified live on 2026-07-22:
  - synced the AI website post-close slice into the live bind-mounted portal checkout at `/home/cory/aether/planes/voice/portal/syndicate-portal`
  - added live portal RedWatch bridge env wiring for `REDWATCH_CLIENT_MODE=http`, `REDWATCH_SERVICE_BASE_URL=https://api.redwatch.us`, `REDWATCH_API_KEY_HEADER_NAME=x-rw-api-key`, and `REDWATCH_EMIT_RECEIPT_SYNC_PATH=/v1/evidence`
  - re-verified the live Starter, Growth, and Operator Stripe mappings from runtime and confirmed they still match the approved canonical values
  - created a real demo tenant through the live BOF substrate:
    - tenant id: `35965af6-22b1-49ba-8b4b-499e9d06cbbe`
    - tenant name: `Syndicate Demo Site 20260722`
    - owner email: `celectricg86+demo-site-20260722@gmail.com`
    - selected plan: `starter`
    - deposit status: `paid`
    - website domain: `demo.syndicateai.co`
    - task id: `56cd1d09-0db8-4361-bd6c-af03b451cd93`
    - task status: `open`
    - current step: `ready_for_provisioning`
    - next operator action: `Build and attach the public demo website for demo.syndicateai.co.`
  - confirmed public runtime health after restart:
    - `GET /login` returned `200`
    - unauthenticated `GET /internal-admin` redirected to `/login`

## Current AI Website Post-Close Truth
- BOF does not introduce or redesign a separate AI website Stripe checkout family in this slice.
- BOF preserves the current approved Starter/Growth/Operator Stripe mappings exactly as sourced from `legal-docs/Syndicate-Stripe-Prod-Ids.md`.
- The AI website offer implemented in BOF is the approved `AI Website Wedge` handoff:
  - build price: `$197`
  - monthly price: `$197`
  - deployment family: `ai-website`
- As of Sunday, July 26, 2026, BOF also exposes an env-backed AI website commercial catalog in `/internal-admin`:
  - build checkout link: sourced from `legal-docs/Syndicate-Stripe-Prod-Ids.md`, with env override support
  - monthly checkout link: sourced from `legal-docs/Syndicate-Stripe-Prod-Ids.md`, with env override support
  - build Stripe price id: sourced from `legal-docs/Syndicate-Stripe-Prod-Ids.md`, with env override support
  - monthly Stripe price id: sourced from `legal-docs/Syndicate-Stripe-Prod-Ids.md`, with env override support
  - default truth if the doc entries are missing and env override is absent: pricing is frozen, but the payment path is not yet configured in that runtime
- The post-close workflow currently starts from an existing tenant/onboarding record and then:
- The live BOF demo proof on `2026-07-22` confirms the smallest complete operator flow now works end to end:
  - tenant/customer state is created first
  - approved Stripe mapping is preserved on the billing state record
  - payment-confirmed website intake can open a provisioning task immediately
  - the operator-visible next action is persisted with the task
- The post-close workflow currently starts from an existing tenant/onboarding record and then:
  - captures website intake data
  - creates or updates a CRM company
  - creates or updates a CRM contact
  - creates or updates a `closed_won` CRM deal
  - creates or updates a provisioning task with structured handoff payload in task notes
  - emits auditable BOF evidence rows through the existing RedWatch bridge-backed receipt path
  - exposes the next required operator action back in `/internal-admin`
- The public demo-site AI surface is live and not fake:
  - `demo.syndicateai.co` submits through `trpc.websiteDemo.submit`
  - `site-demo.syndicateai.co` submits through `trpc.sisDemo.submit`
  - both paths route into the existing owner-email, prospect-confirmation, and Slack delivery flow in the `SYNDICATEAI` repo
- Payment gating is derived from the existing billing state model:
  - `payment_confirmed` requires either a paid billing state or an explicit payment reference
  - `confirmed_close` can still create a blocked provisioning task if payment is not yet recorded
- Website Stripe reconciliation is now partially real and intentionally narrow:
  - `/internal-admin` website checkout links are tenant-aware and append `client_reference_id={tenant_id}`
  - `POST /api/webhooks/stripe` can now recognize the dedicated website build/monthly Stripe price IDs when those env values are configured
  - a website build checkout can advance an existing website task from `awaiting_payment` to `ready_for_provisioning`
  - website checkout completion records auditable bridge evidence on the existing BOF substrate
  - BOF still does not invent a second receipt chain or authoritative website billing ledger
- The demo domain `demo.syndicateai.co` is DNS/TLS-live on the Azure VM, but it still serves the current Syndicate public app until the actual demo website build is attached to that host.

## IMPORTANT CHECKPOINT - 2026-04-10
- Admin tabs are back in the live portal for the operator admin session.
- Live browser verification at `https://voice.syndicateai.co` showed these admin-only tabs visible again:
  - `Audit Log`
  - `Internal Admin`
- Live browser verification also confirmed `/internal-admin` loads again and shows the onboarding/billing control surface:
  - create tenant + owner
  - track onboarding state
  - view Stripe mapping/payment-link area
- This restored the blocked operator workflow from 2026-04-09/2026-04-10: create tenant, send contract manually, send payment link, then validate client-safe access separately.
- Remaining known operational gap for this workflow: agreement handling is still manual and not yet automated from this portal.

## Operator Mechanics
- Build command: `npm run build`
- Deploy command: unknown (not defined in repo automation)
- Verification command/path:
  - `npm run test`
  - `npm run build`
  - run app with `npm run dev` or `npm run start`
- Active working branch: unknown
- Main branch policy: `main` is stable, clean, and deployable
- Checkpoint merge rule: merge to `main` only at validated checkpoint stages
- Checkpoint tag convention: not defined in this repo yet
- Post-checkpoint rule: return to working branch after merge/tag
- Reference: `TRUTH/GIT-WORKFLOW-DISCIPLINE.md` (template source folder)

## Operator Profile Reference
- Reference: `TRUTH/OPERATOR_PROFILE.md` (template source folder)
- Use when operator identity, preferences, or standing company facts materially affect execution

## Ownership
- Company: AetherPro Technologies
- Responsible operator: Cory Gibson, Founder & CEO
- Assigned coding agent: workspace coding agent
