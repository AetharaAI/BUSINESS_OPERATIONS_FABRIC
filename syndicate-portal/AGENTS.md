# AGENTS.md

## Role
- This repo is the customer-facing Syndicate Voice Portal web app plus BFF.
- The responsible agent/operator must keep browser access tenant-safe and never expose internal/admin/bootstrap/webhook VoiceOps endpoints.

## Environment
- Repo root: `/home/cory/Documents/BUSINESS_OPERATIONS_FABRIC/syndicate-portal`
- Public URL: target host `voice.syndicateai.co` (deployment status not verified from this repo)
- Deploy path: unknown
- Related repos/services: VoiceOps API (separate repo, branch context provided as `fsm-build`)
- Git remote: unknown

## Ownership
- Company: AetherPro Technologies
- Responsible operator: Cory Gibson, Founder & CEO

## Infra Truth
- Provider: unknown
- Region: unknown
- Instance type: unknown
- Tailscale IP: unknown

## Current Mission
- Deliver v1 portal pages and BFF integration to existing VoiceOps portal endpoints.
- Keep all controls additive and reversible.
- Preserve strict tenant boundaries and server-side endpoint allowlisting.

## Operating Rules
- Verify claims with commands/tests before declaring success.
- Do not modify VoiceOps internals from this repo.
- Do not expose admin/bootstrap/webhook endpoints to browser clients.
- Use environment-based VoiceOps API base URL config.
- Keep canonical docs updated when implementation truth changes.

## Canonical Docs
- `AGENTS.md`
- `PROJECT_STATE.md`
- `CHANGELOG.md`
- `TRUTH.md`

## Known Production Facts
- A Next.js portal app and BFF are implemented in this repo.
- Implemented BFF routes proxy only:
  - `POST /api/v1/auth/login`
  - `GET /api/v1/auth/me`
  - `GET /api/v1/portal/dashboard`
  - `GET /api/v1/portal/business-profile`
  - `GET /api/v1/portal/agent-mode`
  - `PUT /api/v1/portal/agent-mode`
  - `GET /api/v1/portal/audit-log`
- Verified locally on 2026-04-06:
  - `npm run test` passed
  - `npm run build` passed

## Known Gaps
- Deployment to `voice.syndicateai.co` not verified from this repo.
- Business profile is read-only in current v1 implementation.
- Future modules intentionally deferred with TODO markers: team, summaries, escalation contacts, call settings.
- Session hardening beyond basic HTTP-only cookie handling is still pending.

## Standard Workflow
1. Verify reality
2. Change code
3. Update docs
4. Build/deploy
5. Verify live
