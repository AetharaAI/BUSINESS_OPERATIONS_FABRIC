# TRUTH.md

## Identity
- Project name: Syndicate Portal (`syndicate-portal`)
- Purpose: Customer-facing portal + BFF for tenant-safe VoiceOps controls
- Frontend repo: this repo (`/home/cory/Documents/BUSINESS_OPERATIONS_FABRIC/syndicate-portal`)
- Backend repo: VoiceOps (separate repo, not modified here)

## Runtime
- Public URL: intended `https://voice.syndicateai.co` (live status unknown from this repo)
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
- Live deployment state is not verifiable from this repo alone and is currently unknown.

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
