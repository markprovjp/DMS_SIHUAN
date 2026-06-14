# SUPER PROMPT: Production-Ready Hardening Cho DMS AI Admin

Ban la senior full-stack engineer + security reviewer. Hay bien `dms-ai-admin`
thanh he thong noi bo production-ready theo tung phase nho, co test, khong dap
vo chuc nang dang chay.

Doc truoc:

- `AGENTS.md`
- `docs/production-readiness.md`
- `docs/architecture.md`
- `docs/privacy.md`
- `docs/rule-engine.md`

Tham khao:

- Ant Design Pro: https://preview.pro.ant.design/
- Ant Design ProComponents: https://procomponents.ant.design/en-US/components/
- Ant Design Table: https://ant.design/components/table/
- NestJS security: https://docs.nestjs.com/security/helmet
- NestJS authentication: https://docs.nestjs.com/security/authentication
- NestJS authorization: https://docs.nestjs.com/security/authorization
- NestJS validation: https://docs.nestjs.com/techniques/validation
- NestJS throttler: https://docs.nestjs.com/security/rate-limiting
- OWASP JWT Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html
- Prisma production/deployment: https://www.prisma.io/docs/orm/prisma-client/deployment
- Prisma query performance: https://www.prisma.io/docs/orm/prisma-client/queries/query-optimization-performance

## Muc tieu

He thong phai san sang production cho DMS noi bo:

- Auth/JWT an toan hon.
- RBAC ro.
- Rate limit login va endpoint dat tien.
- API DTO validation day du.
- Audit log du.
- Health check/observability co nen.
- Frontend admin AntD dong nhat, nhanh, khong warning.
- Query/pagination san sang du lieu lon.
- Secrets khong lo.
- AI/Vision privacy-safe.

## Nguyen tac lam viec

- Lam tung phase, commit-size nho.
- Khong doi API contract neu khong can.
- Khong rewrite toan bo.
- Khong xoa chuc nang.
- Khong in secret.
- Moi phase phai chay test lien quan.
- Neu thay issue security P0, fix truoc UI/performance.

## Phase 1: Config Va Secret Hardening

Viec can lam:

- Tao config helper/service de validate env.
- Trong `NODE_ENV=production`, app fail fast neu thieu:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `APP_URL`
  - `AI_API_KEY` neu AI enabled
  - `MOBIWORK_USER_ID`, `MOBIWORK_TOKEN` neu sync enabled
- Xoa/vo hieu hardcoded JWT fallback secret khi production.
- Dam bao settings API chi tra masked secret.
- Dam bao log khong co token/API key/database URL.

Acceptance:

- Test production env missing `JWT_SECRET` -> app/config throws controlled error.
- Dev mode van chay duoc voi `.env`.
- `pnpm test`, `pnpm typecheck`.

## Phase 2: Auth, JWT, RBAC

Viec can lam:

- Tao DTO cho login.
- Them `RolesGuard` va decorator `@Roles(...)`.
- Danh dau endpoint admin-only:
  - settings update
  - sync run
  - AI approve
  - export neu can
- Them login audit.
- Them logout audit neu endpoint co.
- Them rate limit cho login.
- Plan hoac implement refresh token rotation:
  - access token short-lived
  - refresh token httpOnly secure sameSite cookie
  - hashed refresh token/session id trong DB
  - rotate on refresh
  - revoke on logout

Acceptance:

- Non-admin cannot call admin-only endpoint.
- Invalid login throttled.
- Login/logout audited.
- No long-lived token recommendation left undocumented.

## Phase 3: API DTO Validation Va Error Shape

Viec can lam:

- Thay `@Body() body: any` bang DTO/class-validator o controllers:
  - auth
  - sync
  - AI analysis
  - vision
  - settings
  - timesheet evaluate/export neu co body
- Them global exception filter neu chua co.
- Error response consistent:
  - `message`
  - `error`
  - `statusCode`
  - optional `correlationId`
- Khong leak provider raw secret/error body.

Acceptance:

- Invalid body -> 400 ro rang.
- Tests cho DTO/validation o endpoint quan trong.
- `pnpm test`, `pnpm typecheck`.

## Phase 4: Observability Va Health

Viec can lam:

- Request id middleware/interceptor.
- Structured logger co mask secret.
- Health endpoints:
  - `/api/health`
  - database
  - redis
  - AI gateway
  - Mobiwork
- Audit log coverage:
  - login failed/success
  - settings update
  - sync preview/run
  - AI analyze/approve
  - vision analyze
  - export
- Optional: OpenTelemetry integration skeleton.

Acceptance:

- Health endpoint tra status ro.
- Moi request co correlation id trong logs.
- Audit table co event quan trong.

## Phase 5: Data Performance

Viec can lam:

- Server-side pagination/filter/sort cho:
  - timesheet days
  - visits
  - orders
  - audit
  - AI runs
- Prisma query:
  - `select` field can thiet
  - stable `orderBy` co tie-breaker `id`
  - indexes neu can migration
- Export lon:
  - gioi han range hoac job-based export.
- Seed/high-volume test data neu can de benchmark.

Acceptance:

- Khong endpoint nao fetch unbounded list lon.
- Query response co `items`, `total`, `page`, `pageSize` hoac contract ro.
- Table frontend dung pagination tu server.

## Phase 6: Frontend Production UX

Viec can lam:

- Tiep tuc chuan Ant Design enterprise.
- React Query dung nhat quan.
- Route-level lazy loading.
- Fix build chunk warning neu hop ly.
- Browser smoke 1440, 768, 390:
  - login
  - dashboard
  - timesheet list/drawer
  - settings
  - sync preview
  - AI test
- Console error = 0.

Acceptance:

- `pnpm --filter @dms-admin/web lint`
- `pnpm --filter @dms-admin/web typecheck`
- Browser smoke pass.

## Phase 7: Jobs, Queues, Reliability

Viec can lam:

- Neu Redis dung that, them queue cho:
  - sync
  - AI analysis
  - export
- Job status ro:
  - PENDING
  - RUNNING
  - COMPLETED
  - FAILED
  - CANCELLED
- Retry/backoff/dead-letter.
- UI poll job.

Acceptance:

- Long-running request tra job id nhanh.
- UI xem duoc progress/log/error.

## Phase 8: Deployment

Viec can lam:

- Dockerfile production cho API/web neu can.
- Compose production hoac runbook.
- Non-root container.
- Env/secrets external.
- Postgres backup/restore doc.
- Cloudflare tunnel/domain doc:
  - local quick tunnel cho demo
  - named tunnel/domain cho production
- CORS/allowed hosts config theo env.

Acceptance:

- Fresh deploy theo docs duoc.
- Public URL login/API works.
- Secrets khong nam trong repo.

## Final Verification

Bat buoc chay:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

Browser:

- Desktop 1440x1000.
- Tablet 768x1024.
- Mobile 390x844.
- Console errors = 0.

Bao cao cuoi:

- File changed.
- Security fixes.
- Performance fixes.
- Production gaps con lai.
- Test evidence.

Khong claim "production-ready" neu con P0/P1 trong `docs/production-readiness.md`.

