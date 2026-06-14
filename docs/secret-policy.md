# DMS AI Admin — Secret & Config Policy

## Production-required environment variables

These MUST be set in `NODE_ENV=production`. App **fails fast on boot** if any required
one is missing (see `apps/api/src/common/config.ts`).

| Var | Required? | Notes |
|---|---|---|
| `NODE_ENV=production` | YES | Triggers fail-fast mode |
| `PORT` | optional | Default 3000 |
| `DATABASE_URL` | YES | Postgres connection string |
| `JWT_SECRET` | YES | ≥ 32 random bytes. Generate: `openssl rand -hex 32` |
| `APP_URL` | YES | Comma-separated CORS allowlist. NO `*` |
| `REDIS_URL` | optional | Defaults to `redis://localhost:6379` |
| `AI_PROVIDER` | if AI used | e.g. `9router` / `openai` |
| `AI_BASE_URL` | if AI used | Gateway URL |
| `AI_API_KEY` | if AI used | Never log this. Masked in `/api/settings` |
| `AI_TEXT_MODEL` | optional | Default `gpt-4o-mini` |
| `AI_VISION_MODEL` | optional | Default `gpt-4o` |
| `AI_WIRE_API` | optional | `openai` \| `responses`. Default `openai` |
| `AI_REASONING_EFFORT` | optional | `low` \| `medium` \| `high` |
| `AI_VERBOSITY` | optional | `low` \| `medium` \| `high` |
| `MOBIWORK_API_BASE` | if sync used | Default `https://openapi.mobiwork.vn` |
| `MOBIWORK_USER_ID` | if sync used | |
| `MOBIWORK_TOKEN` | if sync used | Never log this. Masked in `/api/settings` |
| `ADMIN_EMAIL` | seed only | Used by `prisma/seed.ts` |
| `ADMIN_PASSWORD` | seed only | Must be ≥ 16 chars in prod. Change after first login |
| `TIMEZONE` | optional | Default `Asia/Bangkok` |

## What the app does to keep secrets safe

1. **JWT_SECRET**: no hardcoded fallback in production. Dev mode has a clearly-marked
   unsafe fallback so onboarding stays smooth.
2. **Logging**: `GlobalExceptionFilter` runs every error through `maskSecretsDeep()`.
   Any object with key matching `JWT_SECRET | AI_API_KEY | OPENAI_API_KEY |
   MOBIWORK_TOKEN | DATABASE_URL | REDIS_URL` is replaced with `{ configured, masked }`
   before being sent to the client or logger.
3. **Settings API**: `GET /api/settings` returns secrets masked
   (`****last4`). Frontend never receives plaintext keys.
4. **Frontend**: stores only `access_token` in `localStorage` (short-lived, 15 min
   in prod). Refresh token is in `httpOnly` cookie set by the API.
5. **HTTP headers**: never echo Authorization header back. CORS allowlist is
   explicit — no wildcard.

## Secret rotation

### JWT_SECRET

The app currently uses a single `JWT_SECRET`. To rotate without downtime:

1. Generate new secret: `openssl rand -hex 32`
2. Update config to support multiple secrets (decode with each in order — pending
   implementation; for now, brief logout window is acceptable).
3. Or: schedule rotation during low-traffic window; all users re-login (15-min
   impact max for active sessions, longer for refresh tokens until they expire
   in 30 days).

### AI/Mobiwork token

- Provider dashboard → revoke old, create new
- Update env via secret manager (zero-downtime if managed)
- Old token continues to work until revoked

### Database password

- Rotate via managed Postgres provider (RDS / Cloud SQL) — usually no app-side
  change needed if using IAM auth
- Otherwise: brief API restart required

## Pre-deploy checklist

- [ ] `JWT_SECRET` is set and ≥ 32 bytes
- [ ] No `.env` file with real values in git history
- [ ] `APP_URL` is a specific origin (no `*`)
- [ ] All secrets come from secret manager, not env file
- [ ] CORS origins match real client origins
- [ ] Audit log table present (run `prisma migrate deploy` first)
- [ ] `admin@example.com / change_me` seed password is **disabled** in prod
      (set `ADMIN_PASSWORD` to a unique value before first run, then disable
      the account if no longer needed)

## What to do if a secret leaks

1. **JWT_SECRET**: rotate immediately; expect all users to re-login
2. **AI/Mobiwork token**: revoke at provider, generate new, redeploy within minutes
3. **DATABASE_URL password**: rotate at provider; restart API
4. **Access token in client localStorage**: short TTL (15min) limits blast radius.
   For refresh token compromise: detect via `RefreshToken` reuse detection —
   server revokes entire family automatically.
