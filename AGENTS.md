# DMS AI Admin - Project Rules

## Mission

Build this as a production-grade internal DMS admin system, not a demo.

The app manages field data, attendance scoring, visit correlation, orders, KPI,
inventory, AI management analysis, and privacy-safe check-in image review.

## Non-Negotiables

- Rule engine owns attendance scoring. AI only explains, summarizes, flags risk,
  and suggests actions.
- Vision must not identify faces or verify identity unless policy, consent, and
  legal approval exist.
- Never print or expose secrets: AI keys, Mobiwork token, JWT secret, database URL.
- Do not commit real `.env` values.
- Do not use fake data when real API/database data exists.
- Keep changes scoped. Do not rewrite backend contracts unless required.

## Frontend Rules

- UI must feel like Ant Design enterprise admin: calm, consistent, data-dense.
- Prefer Ant Design components over custom UI.
- Use tables, filters, drawers, descriptions, tags, badges, alerts, tabs, and
  stats in their normal admin use cases.
- No marketing hero sections, neon gradients, glow, glassmorphism, decorative
  blobs, oversized AI branding, or nested cards.
- Every page needs loading, empty, error, and permission-aware states.
- Data pages need stable table widths, pagination, filters, and drawer detail.
- Long text must use ellipsis or wrapped paragraphs; no clipped buttons.
- Browser console must have zero runtime errors and zero AntD deprecated warnings.

## Backend Rules

- All write endpoints need authentication, validation, and audit logging.
- Use DTO/class-validator for request bodies. No unvalidated `any` body on new APIs.
- Use role guards for admin-only actions.
- JWT must not rely on hardcoded fallback secrets in production.
- Add rate limiting for login and expensive AI/sync endpoints.
- External calls need timeout, retry/backoff, structured error handling, and
  masked logs.
- Long-running sync/AI work should run as jobs, not block request threads.

## Auth And Security Rules

- Production JWT secret must be strong, required, and loaded from env/secret manager.
- Access token lifetime should be short.
- Prefer refresh token rotation with httpOnly, secure, sameSite cookie for public
  deployment.
- Avoid storing long-lived bearer tokens in `localStorage`.
- CORS allowlist must be explicit per environment.
- Helmet stays on. Add CSP only after checking Vite/build asset needs.
- Default seed password must be changed or disabled in production.
- Docker/database defaults are development only.

## Performance Rules

- Tables must support server-side pagination/filter/sort once data can grow.
- Avoid loading unbounded datasets into frontend.
- Add stable ordering with unique tie-breaker for paginated queries.
- Select only fields needed from Prisma.
- Add indexes for common filters: date, employee, department, risk, source key,
  sync job, createdAt.
- Use React Query consistently for remote data caching and invalidation.
- Split large frontend chunks by route/module if build warning persists.

## Observability Rules

- Use structured logs. Mask secrets and raw PII.
- Add request id/correlation id.
- Track audit logs for login, sync, settings update, AI analysis, export, and
  sensitive data access.
- Add health endpoints for API, database, Redis, AI gateway, and Mobiwork.
- Production should expose metrics/traces through OpenTelemetry or equivalent.

## Verification Gates

Before calling work done:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Browser smoke:
  - login
  - dashboard
  - timesheet list + drawer
  - settings AI tests
  - sync preview
  - console errors = 0

## Production Release Gate

Do not call the system production-ready until these are true:

- No hardcoded production secrets or fallback secrets.
- JWT/auth/session model reviewed.
- Rate limiting enabled.
- RBAC enforced.
- HTTPS/public URL configured.
- Database backups and migrations documented.
- Docker/prod deploy path exists.
- Health checks and logs exist.
- Dependency audit reviewed.
- Privacy policy for AI Vision documented.

