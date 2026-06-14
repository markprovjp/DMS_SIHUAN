# DMS AI Admin — Production Operations Runbook

This document covers deployment, secrets, monitoring, backup, and incident response
for `dms-ai-admin` running in production.

## 1. Build & Deploy

### One-time: build images

```bash
# From repo root
docker build -t dms-ai-admin-api:latest -f apps/api/Dockerfile .
docker build -t dms-ai-admin-web:latest -f apps/web/Dockerfile \
  --build-arg VITE_API_URL=https://api.your-domain.com .
```

### Deploy with compose

```bash
# Set env first (see section 2)
cp .env.production .env
# JWT_SECRET is REQUIRED in production — fail-fast in app if missing
docker compose --profile production up -d
```

### First-run database setup

```bash
# Run migrations
docker compose --profile production exec api \
  pnpm prisma migrate deploy

# (Optional) seed demo data — DO NOT in real production
docker compose --profile production exec api \
  pnpm db:seed
```

### Behind a reverse proxy / Cloudflare

1. Point your domain (e.g. `dms.your-company.com`) to the host running the compose stack.
2. Cloudflare Tunnel:
   ```bash
   cloudflared tunnel create dms-admin
   cloudflared tunnel route dns dms-admin dms.your-company.com
   cloudflared tunnel run dms-admin
   ```
3. CORS: ensure `APP_URL` includes the public origin.
4. Cookies: `secure` flag is auto-enabled when `NODE_ENV=production` and cookies are
   served by the API. The browser only sends them to the API origin, not the
   Cloudflare-proxied origin — make sure `VITE_API_URL` is the API origin (or
   same-origin if you use a path-based reverse proxy).

## 2. Secrets Management

### NEVER commit:
- `.env.production`
- `JWT_SECRET` (must be ≥ 32 random bytes)
- `AI_API_KEY`
- `MOBIWORK_TOKEN`
- Real `DATABASE_URL` with credentials

### Recommended: external secret manager
- AWS Secrets Manager + ECS task definition envFrom
- GCP Secret Manager + Cloud Run env
- HashiCorp Vault + Kubernetes secrets
- Doppler / Infisical for smaller setups

### Dev only (in `.env`):
```env
JWT_SECRET=dev-only-do-not-use-in-prod
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dms_ai_admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change_me
```

### Rotation policy
- `JWT_SECRET`: rotate quarterly. Graceful: support old + new key during
  overlap window, then drop old. See "Key rotation" in production-readiness.md.
- `AI_API_KEY`: rotate when compromised. Provider usually supports 2 active keys
  for blue/green rollover.
- `MOBIWORK_TOKEN`: rotate if leak. Set up new credential in Mobiwork admin,
  deploy with new env, revoke old.

## 3. Backups

### Automated (compose `postgres-backup` service)

Already configured in docker-compose.yml:
- Daily snapshots kept 7 days
- Weekly kept 4 weeks
- Monthly kept 6 months
- Stored in `./backups` (mount to NFS/S3 in real prod)

### Manual backup

```bash
# One-shot full dump
docker compose exec postgres \
  pg_dump -U postgres -d dms_ai_admin -Fc -f /tmp/backup.dump
docker compose exec postgres cat /tmp/backup.dump > ./backups/manual_$(date +%F).dump
```

### Restore

```bash
# Restore to a NEW database first, never to live one without testing
docker compose exec postgres createdb -U postgres dms_ai_admin_restore
docker compose exec -T postgres pg_restore \
  -U postgres -d dms_ai_admin_restore --no-owner --role=postgres \
  < ./backups/manual_2026-06-14.dump
```

### RTO / RPO targets
- Recommended: RPO ≤ 24h (daily backup + WAL archiving for PITR)
- Recommended: RTO ≤ 4h (restore from backup + re-deploy)

For tighter SLAs: enable WAL archiving to S3 (`wal-g` or `barman`).

## 4. Health & Monitoring

### Endpoints

- `GET /api/health` — aggregate (db/redis/ai/mobiwork)
- `GET /api/health/db`
- `GET /api/health/redis`
- `GET /api/health/ai`
- `GET /api/health/mobiwork`

All return `200` if healthy, `503` if dependency fails.

### Recommended: external monitoring
- Uptime probe every 30s against `/api/health`
- Alert channels: PagerDuty / Slack
- Logs: ship to Loki / CloudWatch (the app already uses NestJS Logger with
  request-id correlation)

### Logs structure
- Each request gets a `x-request-id` (UUID or client-supplied)
- Returned in response header for client-side correlation
- NestJS Logger emits `error | warn | log` levels

## 5. Scaling Considerations

### Current architecture (single instance, in-process jobs)
- API + Web on 1 host each
- Postgres + Redis co-located (small scale) or managed
- Jobs run in-process — vertical scale only

### When to migrate to multi-instance
- CPU > 70% sustained
- Concurrent AI analysis > 5
- Sync jobs competing

### Migration path: BullMQ
1. Implement `BullMqJobQueue` against the `JobQueue` interface
2. Add Redis-backed jobs in `app.module.ts` based on `REDIS_URL`
3. Run API in N replicas — Redis ensures job is claimed by 1 replica only
4. Keep UI polling `/api/jobs/:id` works as-is

## 6. Incident Response

### 401 storm (token leak)
- All refresh tokens are tied to a `family`. Reuse detection auto-revokes the
  whole family — see `auth.service.ts:refresh()`.
- Identify compromised user via `AuditLog LOGIN_SUCCESS` from unusual IP.
- Reset user password + force logout all sessions.

### DB corruption / accidental delete
1. Identify time of incident via `AuditLog` and `SyncJob.error`.
2. Stop API: `docker compose stop api web`.
3. Restore DB from latest backup.
4. Replay any in-flight sync jobs manually.

### AI provider outage
- AI analysis pages show "AI chưa cấu hình" / "Kết nối thất bại"
- Rule engine and sync continue working — AI is non-critical
- Switch provider via Settings → AI tab

## 7. Dependency / Security Audit

Run before each release:

```bash
pnpm audit --prod
pnpm outdated
```

Update within 30 days for critical/high CVEs. Pin minor versions, allow patch
auto-update via Renovate/Dependabot.

## 8. Privacy Notes (AI Vision)

- Vision is **OFF by default**. Toggle in Settings → AI tab.
- Vision only classifies image content — never identifies faces.
- No biometric inference. See `docs/privacy.md` for full policy.
- Image URLs only stored as hash + classification, never the binary.
