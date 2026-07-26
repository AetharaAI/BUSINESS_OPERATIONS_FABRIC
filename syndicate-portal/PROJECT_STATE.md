# PROJECT_STATE.md

## Repo
- Name: `syndicate-portal`
- Root: `/home/cory/Aether-Admin-Platform/BUSINESS_OPERATIONS_FABRIC/syndicate-portal`
- Public URL: `voice.syndicateai.co` (operator-verified live in browser on 2026-04-10)
- Deploy target: `b3-32-us-west-or-1` (`100.92.18.20`)
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
  - additive workforce session overlay for delegated onboarding (`customer`, `internal_sales_rep`, `internal_operator`, `platform_admin`)
  - scoped onboarding attribution/filtering for sales-rep-created or assigned tenants
  - real CRM data plane in Postgres via Drizzle under the `bof_crm` schema
  - contract lifecycle state machine with event logging and PandaDoc webhook scaffold
  - AI website post-close provisioning adapter on top of existing tenant, CRM, billing, and audit patterns
  - internal admin AI website handoff panel that creates or updates a closed-won CRM deal, provisioning task, and next-operator-action summary
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
- Dependency security verification on 2026-05-19:
  - upgraded portal to `next@15.5.18`
  - upgraded `react` / `react-dom` to `19.1.2`
  - added npm overrides for patched `postcss` and `ws`
  - `npm audit` returned `0 vulnerabilities`
  - `npm run test` passed (`21` tests)
  - `npm run build` passed
- Live redeploy verification on 2026-04-10:
  - VM pulled portal changes and rebuilt the Next app
  - operator confirmed admin tabs returned in the live site after rebuild
- Live auth repair on `2026-06-30`:
  - `voice.syndicateai.co` login page loaded, but `POST /api/session/login` returned `500`
  - root cause was live `.env.production` pointing `VOICEOPS_API_BASE_URL` at public `https://voice.aetherpro.us`
  - on the same VM, that upstream loops back through the hardened VoiceOps nginx ingress and gets `403 Forbidden`
  - fixed live config to `http://127.0.0.1:8102`, rebuilt the Next app, and restarted `syndicate-portal.service`
  - post-fix public verification on `2026-06-30`: invalid-credential login now returns `401` with VoiceOps auth details instead of `500`
- Runtime artifact identifiers: not tracked in this repo yet.
- Local workforce auth verification on `2026-07-16`:
  - `npm test` passed (`25` tests)
  - `npm run build` passed
  - delegated workforce routes compiled successfully with Next `15.5.18`
- Local CRM data-plane verification on `2026-07-16`:
  - `drizzle/0000_low_changeling.sql` applied successfully to the real `syndicate` Postgres database
  - `syndicate` database role verified `rolsuper = false` and `rolbypassrls = false`
  - RLS negative proof passed against the real DB
  - `npm test` passed (`29` tests)
  - `npm run build` passed
- Local post-close provisioning verification on `2026-07-22`:
  - exact approved Starter and Growth Stripe IDs/links were re-verified from `../legal-docs/Syndicate-Stripe-Prod-Ids.md`
  - `npm test -- tests/billing-state-store.test.ts tests/stripe-webhook-bridge.test.ts tests/website-provisioning.test.ts` passed (`4` tests)
  - `npm run build` passed
- Local website checkout bridge verification on Sunday, July 26, 2026:
  - `npm test -- tests/website-offer-catalog.test.ts tests/website-provisioning.test.ts tests/billing-state-store.test.ts tests/stripe-webhook-bridge.test.ts` passed (`8` tests)
  - `npm run build` passed
  - tenant-aware website checkout URLs now append `client_reference_id={tenant_id}` and `prefilled_email`
  - `POST /api/webhooks/stripe` now recognizes dedicated website build/monthly Stripe price IDs from `../legal-docs/Syndicate-Stripe-Prod-Ids.md`, with env override support
- Live post-close provisioning verification on `2026-07-22`:
  - synced the website-provisioning slice into the live portal bind mount at `/home/cory/aether/planes/voice/portal/syndicate-portal`
  - wired live portal RedWatch bridge env for `POST https://api.redwatch.us/v1/evidence`
  - re-verified live runtime Stripe mappings for `starter`, `growth`, and `operator`; all approved product ids, price ids, and payment links remained intact
  - created a live demo tenant and website-provisioning handoff:
    - tenant id: `35965af6-22b1-49ba-8b4b-499e9d06cbbe`
    - tenant name: `Syndicate Demo Site 20260722`
    - owner email: `celectricg86+demo-site-20260722@gmail.com`
    - selected plan: `starter`
    - website domain: `demo.syndicateai.co`
    - task id: `56cd1d09-0db8-4361-bd6c-af03b451cd93`
    - task status: `open`
    - current step: `ready_for_provisioning`
    - next operator action: `Build and attach the public demo website for demo.syndicateai.co.`
  - live portal runtime recovered after clearing the stale `.next` build cache:
    - `GET /login` returned `200`
    - unauthenticated `GET /internal-admin` redirected to `/login`

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
- On the live VM, portal-to-VoiceOps calls should use loopback/backend-local routing, not the public VoiceOps hostname.
- Endpoint base URL configured by `VOICEOPS_API_BASE_URL`.
- CRM Postgres data plane uses the existing Triad Postgres and the existing `syndicate` database/role; no new DB was introduced.

## Remaining Gaps
- Immediate revenue-critical priorities as of Sunday, July 26, 2026:
  - keep the approved Starter/Growth Stripe links intact and operator-usable
  - make the AI website offer commercially usable from BOF without redesigning pricing
  - keep the live demo-site AI intake path working for Monday outreach
  - keep website post-close tasking auditable and visible to the next operator
- Promise workforce onboarding is now live-validated on Friday, July 17, 2026, including invite, reset-password, login, session resolution, and non-production W-8BEN upload.
- A reusable operator playbook now exists in `live-workforce-playbook.ts` to mint repeatable workforce preview identities such as employee-surface review accounts.
- Durable workforce storage is confirmed live with `WORKFORCE_STORAGE_MODE=s3` and bucket `syndicate-workforce-docs`.
- Workforce receipts still land in the canonical `workforce_receipts` table on the shared substrate, but BOF now emits consequential events to live RedWatch as a relying party bridge and stores only the returned `evidence_id` plus canonical event metadata in BOF.
- Workforce invite delivery now forwards the BOF onboarding case id to VoiceOps via `x-workforce-case-id`, so auth recovery and workforce issuance share one traceable delivery path.
- Live transactional invite email was verified through the shared VoiceOps auth recovery path on Friday, July 17, 2026, after correcting the preview Gmail typo from `cekectricg86@gmail.com` to `celectricg86@gmail.com`.
- A reusable `emitEvidenceReceipt()` helper now exists in `lib/server/workforce/receipts.ts` so consequential onboarding events can be wrapped as RedWatch-style evidence receipts on the same BOF substrate used for workforce receipts.
- Promise Sunday now has a live canonical evidence receipt in `bof_crm.workforce_receipts` with action `redwatch.evidence.recorded`, linking his onboarding case, agreement evidence hashes, and delivered invite email event under one record.
- Live RedWatch bridge verification passed on Saturday, July 18, 2026:
  - direct BOF emit proof returned `rw_02a3d8710b76470d908a413c1d50448d`
  - starter deposit webhook proof returned `rw_89435fbeaa2645079345b9cdaaa131da`
- Starter-plan current-flow seed remains intact: new starter tenants still get deposit + final-setup Stripe button/link metadata from the canonical plan map.
- Growth-plan current-flow seed is now explicitly covered too: new growth tenants get the approved deposit + final-setup Stripe button/link metadata from the same canonical plan map.
- AI website post-close flow now exists locally:
  - live-validated against a real demo tenant on `2026-07-22`
  - captures website intake fields
  - creates or updates the company/contact/deal/task chain in `bof_crm`
  - forces the website deal to `closed_won`
  - derives provisioning readiness from either `confirmed_close` or `payment_confirmed`
  - emits auditable BOF evidence rows via `workforce_receipts` / RedWatch bridge
  - surfaces the next required operator action in `/internal-admin`
- AI website commercial catalog now exists in BOF runtime as a doc-backed seam with env override support:
  - approved default pricing remains `$197` build / `$197` monthly
  - build and monthly Stripe checkout links now fall back to `../legal-docs/Syndicate-Stripe-Prod-Ids.md` for both operator and scoped sales-rep use without changing Starter/Growth mappings
  - dedicated website Stripe price ids now fall back to the same canonical Stripe IDs doc so BOF can reconcile tenant-scoped website checkout completion
  - env can still override those website values if an emergency runtime repoint is ever needed
- Business profile write (`PUT /api/v1/portal/business-profile`) not implemented in UI/BFF.
- Password activation requires `VOICEOPS_PASSWORD_RESET_PATH` to match an active VoiceOps endpoint.
- Billing status can be updated manually and via Stripe webhook ingestion (`/api/webhooks/stripe`) when webhook/env are configured correctly.
- Role mapping is basic (`owner`/`admin` editable for agent mode; others read-only).
- Live VoiceOps auth payload shape is still externally owned, so the portal workforce overlay depends on `/api/v1/auth/me` continuing to provide stable session identity fields plus either `role` or `is_platform_admin`.
- Delegated internal workforce activation can still use `PORTAL_WORKFORCE_DIRECTORY_JSON` as a fallback, but the intended path is now persistent DB-backed role grants.
- The CRM request context still takes explicit `workspace_id` and `tenant_id`; the later Passport+Mandate slice must replace that with a signed resolver-backed `WorkspaceContext`.
- Agreement handling is still manual; provider automation/webhook/polling is not implemented yet.
- PandaDoc outbound behavior is still stub-only; live API send and provider auth are intentionally deferred.
- End-to-end tenant onboarding still needs human browser validation with the newly created demo tenant invite/reset flow.
- AI website post-close flow is now live-validated through tenant creation, paid-close state, and provisioning-task creation, but the actual public demo website still needs to be built and attached to `demo.syndicateai.co`.
- No AI website pricing redesign or second billing substrate is introduced in BOF; the current implementation still preserves the approved existing plan mappings and treats website provisioning as a post-close/operator handoff.
- Dedicated AI website Stripe webhook automation now exists as a narrow bridge:
  - the website offer can expose its build/monthly checkout links from the canonical Stripe IDs doc
  - tenant-aware website checkout URLs now append `client_reference_id={tenant_id}` so Stripe completion can reconcile back to the correct BOF tenant/task
  - BOF can consume the canonical website build/monthly Stripe price IDs and advance website task state/evidence without overloading the Starter/Growth price map
  - live operator usability now depends on deploy/restart picking up this repo change, not on hand-entering the website Stripe values into env first
- The employee preview invite flow is operator-ready, but the preview surface still needs human visual review in-browser before it can be treated as approved UX.
- The portal's global production `next build` is still blocked by a pre-existing `/404` prerender issue (`<Html> should not be imported outside of pages/_document`); the live VM currently serves the app via `next dev`, and the website-provisioning slice did not introduce that build failure.
- Additional portal modules deferred:
  - team
  - summaries
  - escalation contacts
  - call settings

## Key Files
- `app/api/v1/people/suggestions/route.ts`
- `app/api/workforce/onboarding/route.ts`
- `app/api/workforce/invite/route.ts`
- `app/api/workforce/me/onboarding/route.ts`
- `app/api/workforce/me/requirements/[id]/upload/route.ts`
- `app/api/workforce/requirements/[id]/verify/route.ts`
- `app/api/portal/*/route.ts`
- `app/api/session/*/route.ts`
- `lib/client/api.ts`
- `lib/types/portal.ts`
- `lib/types/workforce.ts`
- `middleware.ts`
- `app/dashboard/page.tsx`
- `app/business-profile/page.tsx`
- `app/agent-mode/page.tsx`
- `app/audit-log/page.tsx`
- `app/internal-admin/page.tsx`
- `app/internal-admin/workforce/page.tsx`
- `app/billing/page.tsx`
- `app/onboarding/page.tsx`
- `app/api/admin/onboarding-state/route.ts`
- `app/api/admin/website-provisioning/route.ts`
- `app/api/portal/billing-documents/route.ts`
- `lib/server/billing-state-store.ts`
- `lib/server/stripe-plan-map.ts`
- `lib/server/website-provisioning/service.ts`
- `lib/server/db/*`
- `lib/server/crm/*`
- `lib/server/workforce/*`
- `lib/types/website-provisioning.ts`
- `app/internal-admin/WebsiteProvisioningPanel.tsx`
- `lib/server/workforce-session.ts`
- `drizzle/*`
- `RUNBOOK.md`

## Next Steps
1. Open the fresh employee preview invite in a clean browser session and visually review the employee-facing surface end to end.
2. Run the live manual tenant onboarding flow end to end against a test tenant: create tenant, send the agreement manually, send payment link, open invite in separate client session, and confirm client-safe visibility.
3. Use the live demo tenant (`35965af6-22b1-49ba-8b4b-499e9d06cbbe`) to review the reset/invite surface in-browser and verify the customer-facing experience.
4. Build and attach the actual public demo website to `demo.syndicateai.co` using the newly created provisioning task (`56cd1d09-0db8-4361-bd6c-af03b451cd93`) as the operator source of truth.
5. Decide whether AI website close should remain operator-confirmed only or gain its own dedicated Stripe SKU/link family; do not change pricing without canon updates first.
6. Replace the temporary CRM request-context seam with the later Passport+Mandate-backed `WorkspaceContext` resolver.
7. Repoint the current RedWatch `/v1/evidence` bridge to the future canonical receipt route as a config-only cutover once RedWatch ships it.
8. Add real PandaDoc outbound auth/send behavior once provider credentials and approval rules are ready.
