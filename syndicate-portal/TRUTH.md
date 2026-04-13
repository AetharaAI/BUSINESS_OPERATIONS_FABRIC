# TRUTH.md

## Identity
- Project name: Syndicate Portal (`syndicate-portal`)
- Purpose: Customer-facing portal + BFF for tenant-safe VoiceOps controls
- Frontend repo: this repo (`/home/cory/Documents/BUSINESS_OPERATIONS_FABRIC/syndicate-portal`)
- Backend repo: VoiceOps (separate repo, not modified here)

## Runtime
- Public URL: `https://voice.syndicateai.co` (operator-verified live in browser on 2026-04-10)
- API URL: configured by `VOICEOPS_API_BASE_URL` (default `.env.example`: `https://voice.aetherpro.us`)
- Repo root: `/home/cory/Documents/BUSINESS_OPERATIONS_FABRIC/syndicate-portal`
- Deploy path: unknown

## Infra
- Provider: unknown
- Region: unknown
- Instance type: unknown
- Tailscale IP: unknown

## Current Production Truth
- Verified local implementation exists for v1 scope:
  - auth/session flow
  - dashboard
  - business profile (view)
  - agent mode read/update with enforcement-pending warning support
  - audit log table
- internal admin RBAC now resolves from VoiceOps session role/flag (`role=admin` or `is_platform_admin=true`)
- Verified locally on 2026-04-10:
  - `npm run test` passed
  - `npm run build` passed

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
