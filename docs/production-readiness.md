# DMS AI Admin Production Readiness

## Scope

Goal: make `dms-ai-admin` production-grade for an internal DMS admin system:

- Ant Design enterprise admin UX.
- NestJS API with hardened auth, validation, rate limit, audit, observability.
- Prisma/Postgres data layer prepared for real volume.
- Safe AI gateway integration.
- Privacy-safe Vision flow.
- Repeatable deploy path.

## References Studied

Admin/frontend systems:

- Ant Design Pro: https://preview.pro.ant.design/
- Ant Design Pro repository: https://github.com/ant-design/ant-design-pro
- Ant Design ProComponents: https://procomponents.ant.design/en-US/components/
- ProTable: https://procomponents.ant.design/en-US/components/table/
- ProForm: https://procomponents.ant.design/en-US/components/form/
- Ant Design visualization spec: https://ant.design/docs/spec/visualization-page/
- Ant Design Table docs: https://ant.design/components/table/
- Refine Ant Design admin templates: https://refine.dev/core/templates/react-admin-panel-ant-design/
- React Admin repository: https://github.com/marmelab/react-admin

Backend/security references:

- NestJS security docs: https://docs.nestjs.com/security/helmet
- NestJS authentication docs: https://docs.nestjs.com/security/authentication
- NestJS authorization docs: https://docs.nestjs.com/security/authorization
- NestJS validation docs: https://docs.nestjs.com/techniques/validation
- NestJS throttler docs: https://docs.nestjs.com/security/rate-limiting
- OWASP JWT Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html
- OWASP Node.js Docker Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/NodeJS_Docker_Cheat_Sheet.html
- Prisma production docs: https://www.prisma.io/docs/orm/prisma-client/deployment
- Prisma performance docs: https://www.prisma.io/docs/orm/prisma-client/queries/query-optimization-performance
- OpenTelemetry JS docs: https://opentelemetry.io/docs/languages/js/

## Current Findings

### P0 Security

- JWT has a hardcoded fallback secret in `apps/api/src/modules/auth/auth.module.ts`
  and `apps/api/src/modules/auth/jwt.strategy.ts`.
- Frontend stores bearer access token in `localStorage`.
- No refresh token rotation.
- No login rate limiting.
- No RBAC guard beyond basic JWT guard.
- Several controllers accept `@Body() body: any`; new APIs must use DTOs.
- Docker Compose uses development Postgres credentials.
- Public tunnel works, but public deployment needs explicit CORS/host config per
  environment.

### P1 Production Operability

- No health endpoint for API/database/Redis/AI gateway/Mobiwork.
- No structured request logging/correlation id.
- No metrics/tracing.
- Sync/AI long-running paths should be job-backed for real production load.
- No deployment Dockerfile/reverse proxy/prod runbook yet.
- No backup/restore runbook.

### P1 Performance

- Frontend build has large chunk warning.
- Data tables should move toward server-side pagination/filter/sort as volume grows.
- Need stable Prisma query patterns: select only required fields, indexed filters,
  stable ordering.
- React Query is installed but should be used consistently across remote data.

### P2 Frontend Consistency

- UI is being moved toward Ant Design enterprise style.
- Need consistent `PageHeader`, metric cards, status tags, toolbar, table/drawer
  patterns across all modules.
- Browser smoke must stay part of release gate.

## Target Architecture

### Frontend

- React + Vite + TypeScript + Ant Design.
- Route-level code splitting for dashboard, timesheet, visits, orders,
  KPI/inventory, AI analysis, sync, settings, audit.
- React Query for all remote data.
- Shared components:
  - `PageHeader`
  - `StatCard`
  - `FilterToolbar`
  - `StatusTag`
  - `DataTable`
  - `DetailDrawer`
  - `EmptyState`

### Backend

- NestJS modules remain domain-oriented.
- All external integrations behind provider/client classes.
- Controllers use DTOs.
- Guards:
  - JWT guard
  - Role guard
  - optional permission guard later
- Cross-cutting:
  - Helmet
  - CORS allowlist
  - rate limit
  - request id
  - structured logs
  - global validation pipe
  - global exception filter

### Auth

Production target:

- Short-lived access token.
- Refresh token rotation.
- Refresh token in httpOnly, secure, sameSite cookie.
- Access token can stay in memory on frontend; avoid long-lived `localStorage`
  bearer token.
- Server stores hashed refresh token family/session id.
- Login/logout/refresh audited.
- Login throttled by IP + email.

### Data

- Prisma migrations only; no manual schema edits in production.
- Index common filters:
  - timesheet date
  - employee code/name/department
  - risk level
  - sync job/status
  - source endpoint/source key/source hash
  - audit createdAt/action/user
- Server-side pagination for all large tables.
- Export endpoints stream or generate job file for large reports.

### AI

- AI provider config is neutral: provider/base URL/wire API/model/key.
- AI keys masked in API responses and logs.
- Responses API supports both JSON and SSE/event-stream.
- AI output is schema-validated.
- Failed AI parse returns controlled error/fallback, not raw provider dump.
- AI analysis stores prompt version/model/provider/usage for audit.

### Vision Privacy

- Vision checks only image relevance/quality/work context.
- No identity verification.
- No face recognition.
- No biometric inference.
- Store minimum metadata needed.
- Add privacy notice in settings and docs.

## Implementation Roadmap

### Phase 0: Repo Rules And Baseline

- Add `AGENTS.md`.
- Keep `docs/production-readiness.md` as release checklist.
- Run baseline:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`

### Phase 1: Auth Hardening

- Remove hardcoded JWT fallback secret in production.
- Add config validation for required env vars.
- Add auth DTOs.
- Add rate limiting to login.
- Add role guard and `@Roles()` decorator.
- Add audit log for login/logout/settings/export/sync/AI.
- Plan refresh-token rotation.

Acceptance:

- App fails fast if production env misses `JWT_SECRET`.
- Login brute-force is throttled.
- Admin-only endpoints cannot be used by non-admin users.

### Phase 2: API Hardening

- Replace `@Body() body: any` on public controllers with DTOs.
- Add global exception filter.
- Add request id middleware.
- Add structured logger.
- Add health endpoints:
  - `/api/health`
  - `/api/health/db`
  - `/api/health/redis`
  - `/api/health/ai`
  - `/api/health/mobiwork`

Acceptance:

- Invalid requests return consistent 400.
- Logs include request id and no secrets.
- Health endpoint detects dependency failures.

### Phase 3: Performance/Data

- Add server-side pagination/filter/sort to Timesheet, Visits, Orders, Audit.
- Ensure Prisma `select` avoids overfetch.
- Add missing indexes after checking actual query patterns.
- Add route-level frontend lazy loading.
- Split large chart/admin chunks if warning remains.

Acceptance:

- Large tables do not fetch all rows.
- Build chunk warning reduced or documented.
- Main pages stay responsive under seeded high-volume dataset.

### Phase 4: Jobs And Reliability

- Move heavy sync/AI/export to queued jobs.
- Use Redis-backed queue if Redis remains part of stack.
- Add job retry/backoff/dead-letter state.
- Add cancellation/re-run support.

Acceptance:

- Request returns job id fast.
- UI polls job status.
- Failed job has controlled error and audit log.

### Phase 5: Deployment

- Add production Dockerfile(s).
- Add production compose or deployment docs.
- Use non-root container user.
- Use environment secrets, not committed config.
- Add backup/restore docs for Postgres.
- Add Cloudflare production tunnel/domain runbook.

Acceptance:

- Fresh machine can deploy from documented steps.
- Secrets are supplied externally.
- Public URL works with correct CORS/host allowlist.

## Coding Rules For Future Work

- Do not create new unvalidated endpoints.
- Do not store new secrets in DB unless encrypted or explicitly designed.
- Do not log raw external API responses if they may contain PII or tokens.
- Do not add broad abstractions unless two modules need the same behavior.
- Prefer Ant Design/ProComponents over custom UI widgets.
- Prefer server-side filtering for real datasets.
- Add tests for rule engine and integration edge cases.
- Browser-test important UI flows before handoff.

## Release Checklist

Security:

- [ ] `JWT_SECRET` required in production.
- [ ] No hardcoded production secrets.
- [ ] Rate limit login.
- [ ] RBAC enforced.
- [ ] CORS explicit.
- [ ] Secrets masked in logs/settings.
- [ ] Dependency audit reviewed.

Performance:

- [ ] Server-side pagination on large tables.
- [ ] Indexes match filters.
- [ ] Large chunk warning addressed or accepted.
- [ ] Export large files safely.

Operations:

- [ ] Health endpoint.
- [ ] Structured logs.
- [ ] Request id.
- [ ] Audit log coverage.
- [ ] Backup/restore documented.
- [ ] Production deploy doc.

Privacy:

- [ ] Vision privacy policy documented.
- [ ] No face recognition.
- [ ] No identity inference.
- [ ] Image retention policy defined.

