# CHANGELOG.md

## 2026-07-26

### Website Checkout Bridge
- Added env seams for dedicated AI website Stripe price IDs:
  - `PORTAL_AI_WEBSITE_BUILD_STRIPE_PRICE_ID`
  - `PORTAL_AI_WEBSITE_MONTHLY_STRIPE_PRICE_ID`
- Activated the canonical website Stripe entries in `../legal-docs/Syndicate-Stripe-Prod-Ids.md` as the runtime fallback source for:
  - website build checkout link
  - website build Stripe price id
  - website monthly checkout link
  - website monthly Stripe price id
- Extended the website offer bridge so configured website checkouts can reconcile into the existing post-close provisioning task:
  - `/internal-admin` now opens and copies tenant-aware website checkout URLs with `client_reference_id={tenant_id}` and `prefilled_email`
  - `POST /api/webhooks/stripe` now recognizes the dedicated website build/monthly Stripe price IDs
  - a website build checkout can now advance an existing website task from `awaiting_payment` to `ready_for_provisioning`
  - website checkout completion writes auditable bridge evidence without creating a second BOF receipt chain
- Kept the approved current website wedge pricing unchanged:
  - build: `$197`
  - monthly: `$197`
- Verification:
  - `npm test -- tests/website-offer-catalog.test.ts tests/website-provisioning.test.ts tests/billing-state-store.test.ts tests/stripe-webhook-bridge.test.ts` passed (`8` tests)
  - `npm run build` passed

### Website Commercial Catalog Seam
- Added `lib/server/website-provisioning/catalog.ts` so BOF has one canonical runtime seam for the current AI website offer instead of hard-coded panel text only.
- Added env-backed website-offer fields:
  - `PORTAL_AI_WEBSITE_OFFER_LABEL`
  - `PORTAL_AI_WEBSITE_BUILD_PRICE_CENTS`
  - `PORTAL_AI_WEBSITE_MONTHLY_PRICE_CENTS`
  - `PORTAL_AI_WEBSITE_BUILD_STRIPE_PRICE_ID`
  - `PORTAL_AI_WEBSITE_MONTHLY_STRIPE_PRICE_ID`
  - `PORTAL_AI_WEBSITE_BUILD_PAYMENT_LINK`
  - `PORTAL_AI_WEBSITE_MONTHLY_PAYMENT_LINK`
  - `PORTAL_AI_WEBSITE_PROMO_NOTE`
- Extended `GET /api/admin/website-provisioning` to return both the current provisioning item and the website commercial catalog.
- Updated `/internal-admin` website provisioning UI to show:
  - the approved AI website offer/pricing from runtime catalog
  - explicit website payment-path status
  - operator guidance when the website payment links are missing
  - build/monthly checkout open + copy actions when the links are configured
- Kept this slice narrow and reversible:
  - Starter/Growth/Operator Stripe mappings were not altered
  - no new website receipt store was introduced
  - no website webhook automation was added without canonized website Stripe identifiers

### Verification
- Added `tests/website-offer-catalog.test.ts` to prove:
  - the default website wedge pricing stays `$197` build / `$197` monthly
  - runtime-configured website payment links surface cleanly without changing the pricing model

## 2026-07-22

### AI Website Post-Close Workflow
- Preserved the approved current Stripe mapping logic and tightened verification to exact live Starter and Growth product IDs, price IDs, and checkout links from `legal-docs/Syndicate-Stripe-Prod-Ids.md`.
- Added typed AI website post-close contracts in `lib/types/website-provisioning.ts`.
- Added `aiWebsiteProvisioningService` in `lib/server/website-provisioning/service.ts` to reuse the existing BOF substrate for:
  - tenant billing-state payment gating
  - CRM company/contact/deal creation or update
  - `closed_won` website deal creation
  - provisioning task creation or update
  - auditable status updates through `workforce_receipts` / RedWatch bridge
- Added `GET|POST|PUT /api/admin/website-provisioning` as the smallest complete operator API for the new handoff flow.
- Added `WebsiteProvisioningPanel` to `/internal-admin` so operators can:
  - capture website onboarding data
  - generate the provisioning task
  - see the current payment gate and next operator action
  - update provisioning status with an auditable trail
- Kept this slice intentionally narrow:
  - no new BOF-side pricing model
  - no AI website Stripe SKU redesign
  - no new dedicated evidence store
  - no new DB migration for provisioning records; BOF reuses CRM tasks plus receipt indexing

### Verification
- Verified locally on 2026-07-22:
  - `npm test -- tests/billing-state-store.test.ts tests/stripe-webhook-bridge.test.ts tests/website-provisioning.test.ts` passed (`4` tests)
  - `npm run build` passed
- The new service-level proof covers:
  - paid tenant -> website handoff capture
  - company/contact/deal/task creation
  - `closed_won` deal state
  - provisioning status update
  - receipt rows for both task creation and status update
- Verified live on 2026-07-22:
  - deployed the website-provisioning slice into the live portal checkout at `/home/cory/aether/planes/voice/portal/syndicate-portal`
  - wired live BOF evidence emission to the RedWatch bridge contract at `POST https://api.redwatch.us/v1/evidence`
  - confirmed live runtime Stripe mappings still match the approved Starter/Growth/Operator catalog
  - created live demo tenant `35965af6-22b1-49ba-8b4b-499e9d06cbbe` (`Syndicate Demo Site 20260722`) with:
    - owner email `celectricg86+demo-site-20260722@gmail.com`
    - plan `starter`
    - deposit state `paid`
    - website domain `demo.syndicateai.co`
    - provisioning task `56cd1d09-0db8-4361-bd6c-af03b451cd93`
    - next operator action `Build and attach the public demo website for demo.syndicateai.co.`
  - restored live login/runtime health after clearing a stale `.next` cache left behind by a failed production build attempt:
    - `GET /login` returned `200`
    - unauthenticated `GET /internal-admin` redirected to `/login`

### Still Remaining
- `demo.syndicateai.co` is DNS/TLS-live but still serves the current Syndicate public app until the actual demo website is built and attached.
- A pre-existing global production build issue remains outside this slice:
  - `next build` still fails on `/404` with `<Html> should not be imported outside of pages/_document`
  - the live VM is currently serving the portal through `next dev`

## 2026-07-18

### RedWatch Bridge Wiring
- Repointed BOF workforce evidence emission to the live RedWatch relying-party bridge at `POST https://api.redwatch.us/v1/evidence` using the configurable `x-rw-api-key` header contract.
- Kept BOF as a non-authoritative index only:
  - BOF persists canonical `event.v1` metadata plus the returned RedWatch `evidence_id`
  - BOF no longer computes or stores receipt-chain fields for new bridge emissions
- Kept evidence emission asynchronous and non-blocking so workforce, contract, and payment paths do not fail closed on RedWatch transport outages.

### Verification
- Verified locally on 2026-07-18:
  - `npm test -- billing-state-store.test.ts stripe-webhook-bridge.test.ts workforce-receipts.test.ts` passed
  - `npm run build` passed
- Verified live against RedWatch on 2026-07-18:
  - BOF live bridge proof emitted successfully and returned `evidence_id=rw_02a3d8710b76470d908a413c1d50448d`
  - Starter deposit webhook proof emitted successfully and returned `evidence_id=rw_89435fbeaa2645079345b9cdaaa131da`

## 2026-07-17

### Promise Invite Evidence
- Added `emitEvidenceReceipt()` in `lib/server/workforce/receipts.ts` as the BOF-side helper for RedWatch-style evidence receipts.
- Recorded a canonical live evidence row for Promise Sunday on the BOF workforce receipt substrate:
  - receipt action: `redwatch.evidence.recorded`
  - receipt id: `337e3e9e-2ffb-4db8-afec-2eb6d7d355e8`
  - receipt correlation id: `f2b3d8a5-5b5e-4bb4-a7d4-1d89986810fd`
  - onboarding case id: `e626c01a-5635-4c07-a4df-272dd9b8c3de`
  - linked delivery email id: `61c80cd1-9910-4856-9d65-7b3d8c95dfe9`
  - linked source correlation label: `promise-live-invite-2026-07-17T00-18-00-indy`
- Updated Promise’s live agreement record metadata with contract evidence for:
  - `/home/cory/Aether-Admin-Platform/AETHERPRO_COMPANY_DOSSIER/Contractors/AetherPro_Promise_Sunday_Commission_Agreement template.pdf`
  - `/home/cory/Aether-Admin-Platform/AETHERPRO_COMPANY_DOSSIER/Contractors/AetherPro_Promise_Sunday_Commission_Agreement.docx`
- Stored the PDF SHA-256 on the agreement record and preserved both document hashes in the agreement metadata payload.

## 2026-07-16

### CRM Data Plane + Contract State Machine
- Added Drizzle + `pg` wiring for a new BOF CRM data plane in Postgres.
- Added the initial CRM schema in `bof_crm` with concrete typed tables:
  - `companies`
  - `contacts`
  - `deals`
  - `contracts`
  - `contract_recipients`
  - `contract_events`
  - `tasks`
- Generated and applied migration `drizzle/0000_low_changeling.sql`.
- Hardened the migration with `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY`, and workspace/tenant RLS policies on every CRM table.
- Added server-side CRM routes for company, contact, deal, and contract flows plus a PandaDoc webhook scaffold.
- Added a contract state machine with legal transition enforcement and event recording on every state change.
- Added a PandaDoc adapter seam in stub mode only; no live PandaDoc send was introduced.
- Left the request-context seam explicit so a later Passport+Mandate-backed `WorkspaceContext` resolver can replace the current request-supplied `workspace_id` / `tenant_id` gate without rewriting the CRM service layer.

### CRM Verification
- Verified locally on 2026-07-16:
  - Drizzle migration applied successfully against the real `syndicate` Postgres database.
  - `syndicate` Postgres role confirmed `rolsuper = false` and `rolbypassrls = false`.
  - RLS negative proof passed: workspace B could not read or insert workspace A rows.
  - `npm test` passed (`29` tests), including the real CRM/RLS proof suite.
  - `npm run build` passed on `Next.js 15.5.18`.

### Delegated Workforce Onboarding
- Added an additive workforce authorization layer for the live `voice.syndicateai.co` portal that can distinguish `customer`, `internal_sales_rep`, `internal_operator`, and `platform_admin` sessions without changing the VoiceOps backend.
- Added scoped session enrichment in `GET /api/session/me` for `subject`, `handle`, `workforce_role`, `capability_scope`, and `tenant_scope_mode`.
- Added `PORTAL_WORKFORCE_DIRECTORY_JSON` as the portal-side overlay to activate delegated internal workforce identities such as Promise without hard-coding permissions in route handlers.
- Updated `/internal-admin` and `/api/admin/onboarding-state` to allow scoped workforce onboarding access while keeping existing operator admin behavior intact.
- Added attribution metadata to onboarding records, including creator/sales-rep identity fields, approval status, onboarding status, and audit correlation ID.
- Restricted sales-rep onboarding visibility to created-or-assigned tenants only and restricted sales-rep audit access to their own activity.

### Verification
- Verified locally on 2026-07-16:
  - `npm test` passed (`25` tests)
  - `npm run build` passed
  - build completed on `Next.js 15.5.18`

## 2026-06-30

### Live Portal Auth Repair
- Fixed the live `voice.syndicateai.co` login regression on `b3-32-us-west-or-1`.
- Root cause: portal `.env.production` used `VOICEOPS_API_BASE_URL=https://voice.aetherpro.us`, so server-side auth calls from the portal VM looped back through the hardened VoiceOps nginx ingress and were denied before reaching the backend.
- Updated live portal config to `VOICEOPS_API_BASE_URL=http://127.0.0.1:8102`.
- Rebuilt the Next.js production bundle and restarted `syndicate-portal.service`.
- Verification:
  - direct backend auth on loopback returns expected auth responses
  - `https://voice.syndicateai.co/api/session/login` now returns `401` for invalid credentials instead of `500`

## 2026-07-16

### Workforce Onboarding Slice
- Added a bounded workforce domain on the shared BOF CRM substrate with canonical tables for:
  - `people`
  - `workforce_relationships`
  - `workforce_role_grants`
  - `agreement_records`
  - `compliance_document_requirements`
  - `compliance_document_versions`
  - `onboarding_cases`
  - `workforce_receipts`
- Added Drizzle migration `drizzle/0001_aromatic_prima.sql` for the workforce slice, including indexes and RLS policy scaffolding.
- Added persistent DB-backed workforce session resolution with fallback to the existing `PORTAL_WORKFORCE_DIRECTORY_JSON` overlay so delegated sessions can transition without breaking live auth.
- Added operator workflow APIs:
  - `GET /api/v1/people/suggestions`
  - `GET|POST /api/workforce/onboarding`
  - `POST /api/workforce/invite`
  - `POST /api/workforce/requirements/[id]/verify`
- Added workforce self-service APIs:
  - `GET /api/workforce/me/onboarding`
  - `POST /api/workforce/me/requirements/[id]/upload`
- Added new portal surfaces:
  - `/internal-admin/workforce`
  - `/onboarding`
- Added protected routing and portal navigation entries for the workforce onboarding slice.
- Added secure workforce document-upload handling with MIME/type checks, file-size limits, object-storage abstraction, and receipt writes through the shared substrate.

### Verification
- Verified locally on 2026-07-16:
  - `npm test -- --run tests/workforce-auth.test.ts tests/internal-admin-authz.test.ts tests/crm-data-plane.test.ts` passed (`12` tests)
  - `npm run build` passed on `Next.js 15.5.18`
- Verified live on 2026-07-17:
  - seeded Promise Sunday as a canonical BOF workforce member and validated the self-service onboarding surface end to end
  - uploaded a non-production W-8BEN fixture into `s3://syndicate-workforce-docs/...`
  - added `live-workforce-playbook.ts` so workforce preview profiles and repeat invites can be minted from one configurable operator playbook

## 2026-05-19

### Dependency Security
- Upgraded portal runtime dependencies to a safer stable baseline:
  - `next` `15.3.1 -> 15.5.18`
  - `react` `19.1.0 -> 19.1.2`
  - `react-dom` `19.1.0 -> 19.1.2`
- Added npm overrides to pin patched transitive packages:
  - `postcss` `8.5.15`
  - `ws` `8.20.1`
- Regenerated `package-lock.json` from the updated dependency graph.

### Verification
- Verified locally on 2026-05-19:
  - `npm audit` reports `0 vulnerabilities`
  - `npm run test` passed (`21` tests)
  - `npm run build` passed on `Next.js 15.5.18`

## 2026-04-13

### Internal Admin
- Updated `/internal-admin` agreement tracking fields and labels to use provider-neutral terminology.
- Added optional `agreement_provider`, `agreement_provider_document_id`, `agreement_number`, and `agreement_signed_at` support to the local onboarding/billing state model.
- Kept legacy `docusign_envelope_id` reads/writes working via a compatibility alias layer while the persisted model remains in transition.

## 2026-04-10

### Access Control
- Fixed internal admin RBAC regression so portal admin surfaces resolve from VoiceOps session role/flag instead of requiring only `is_platform_admin`.
- Restored `/internal-admin` and audit-log visibility for authenticated admin sessions while keeping non-admin tenant users out.
- Added authz coverage for admin-role and platform-admin session combinations.

### Live Checkpoint
- Operator verified after live pull/rebuild that the production portal again shows `Audit Log` and `Internal Admin` for the admin account.
- Operator verified that the live `/internal-admin` page loads again and exposes tenant creation, onboarding state tracking, and Stripe mapping/payment-link controls.
- Recorded this as the cleared blocker before running the manual customer onboarding/payment flow.

## 2026-04-06

### Application
- Scaffolded standalone Next.js customer portal app in `syndicate-portal`.
- Added authenticated pages for dashboard, business profile, agent mode, and audit log.
- Added middleware route protection for portal pages.
- Added branding assets and integrated logo in portal header UI.
- Added generated favicon/icon assets (`favicon.ico`, `icon.png`, `apple-icon.png`).
- Added internal admin onboarding UI (`/internal-admin`) for tenant + owner bootstrap.
- Added first-login activation page (`/activate`) for password set flow.
- Added billing scaffold page (`/billing`).
- Extended internal admin into onboarding + billing control center with tenant selection and state tracking.

### API / BFF
- Added server-side BFF routes for approved endpoint set:
  - `POST /api/v1/auth/login`
  - `GET /api/v1/auth/me`
  - `GET /api/v1/portal/dashboard`
  - `GET /api/v1/portal/business-profile`
  - `GET /api/v1/portal/agent-mode`
  - `PUT /api/v1/portal/agent-mode`
  - `GET /api/v1/portal/audit-log`
- Added typed request/response schemas and client error handling.
- Added agent-mode warning banner when `effective_in_live_routing=false`.
- Added admin bootstrap endpoint: `POST /api/admin/tenant-bootstrap`.
- Added invite activation endpoint: `POST /api/admin/activate-invite`.
- Added billing link scaffold endpoint: `GET /api/admin/billing-link`.
- Added onboarding state endpoints: `GET|POST|PUT /api/admin/onboarding-state`.
- Added customer billing/documents endpoint: `GET /api/portal/billing-documents`.
- Added persistent additive billing state model (schema-versioned local store).
- Added Stripe plan mapping parser using `legal-docs/Syndicate-Stripe-Prod-Ids.md` as source of truth.

### Testing
- Added Vitest-based tests for API client and critical UI behavior.
- Verified locally:
  - `npm run test` passed
  - `npm run build` passed

### Deployment
- Added `RUNBOOK.md` with local run/build/deploy instructions.
- Live deployment to `voice.syndicateai.co` not verified from this repo.

### Documentation
- Added canonical docs:
  - `AGENTS.md`
  - `PROJECT_STATE.md`
  - `CHANGELOG.md`
  - `TRUTH.md`
- Updated ownership/legal metadata:
  - `LICENSE` holder set to AetherPro Technologies
  - ownership fields set to Cory Gibson, Founder & CEO
