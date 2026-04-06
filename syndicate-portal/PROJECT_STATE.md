# PROJECT_STATE.md

## Repo
- Name: `syndicate-portal`
- Root: `/home/cory/Documents/BUSINESS_OPERATIONS_FABRIC/syndicate-portal`
- Public URL: target host `voice.syndicateai.co` (not verified live from this repo)
- Deploy target: unknown
- GitHub remote: unknown

## Production Status
- Implemented locally:
  - login/session flow
  - dashboard page (`/portal/dashboard` via BFF)
  - business profile page (`/portal/business-profile` via BFF)
  - agent mode read/update (`/portal/agent-mode` via BFF)
  - audit log table (`/portal/audit-log` via BFF)
- Not verified from this repo:
  - live deployment status
  - DNS/reverse proxy cutover status

## Deploy Reality
- Local build verification on 2026-04-06:
  - `npm run test` passed (7 tests)
  - `npm run build` passed
- Runtime artifact identifiers: not tracked in this repo yet.

## Repo Alignment Status
- Local working tree has implementation changes for initial v1 scaffold.
- Branch/merge/push state: unknown (no git metadata available in parent workspace).

## Dependencies
- VoiceOps API (separate repo/service) for auth and portal endpoint substrate.
- Endpoint base URL configured by `VOICEOPS_API_BASE_URL`.

## Remaining Gaps
- No verified deployment record in this repo yet.
- Business profile write (`PUT /api/v1/portal/business-profile`) not implemented in UI/BFF.
- Role mapping is basic (`owner`/`admin` editable for agent mode; others read-only).
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
- `RUNBOOK.md`

## Next Steps
1. Verify end-to-end against live/staging VoiceOps credentials and record deployment truth.
2. Add business profile update flow and stricter session/token lifecycle handling.
