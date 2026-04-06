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
4. Open `http://localhost:3000/login`

## Production Build
1. `cd syndicate-portal`
2. `npm ci`
3. `npm run build`
4. `npm run start`

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
   - `GET /api/v1/portal/dashboard`
   - `GET /api/v1/portal/business-profile`
   - `GET /api/v1/portal/agent-mode`
   - `PUT /api/v1/portal/agent-mode`
   - `GET /api/v1/portal/audit-log`
3. Admin/bootstrap/webhook endpoints are not exposed in browser code.
4. Session token is stored in HTTP-only cookie (`syndicate_portal_session`).

## Test Commands
1. `npm run test`

## Known Gaps
1. Session hardening enhancements pending (token refresh, idle timeout policy).
2. Role mapping currently uses VoiceOps role strings (`owner`/`admin` editable, others read-only for mode changes).
3. Business profile is view-only in v1 implementation.
4. Future portal modules are intentionally hidden with TODO markers:
   - Team
   - Summaries
   - Escalation contacts
   - Call settings
