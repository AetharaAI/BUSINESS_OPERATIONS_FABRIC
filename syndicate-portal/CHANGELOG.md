# CHANGELOG.md

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
