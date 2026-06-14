# Migration: add_refresh_token

Adds persistent refresh-token storage with rotation + reuse detection.

## What it does

1. Adds `User.isActive` (default true) and `User.lastLoginAt` columns.
2. Creates `RefreshToken` table with:
   - `id` (jti) primary key
   - `userId` foreign key to `User` with `ON DELETE CASCADE`
   - `tokenHash` (SHA-256 of opaque token) with unique constraint
   - `family` for rotation chain
   - `expiresAt`, `revokedAt`, `replacedBy` for rotation tracking
   - `userAgent`, `ipAddress` for audit
3. Indexes on `userId`, `family`, `expiresAt` for fast lookups.

## How to apply

### Dev

```bash
docker-compose up -d
pnpm db:migrate
```

### Production

```bash
# In a deploy job, before starting the API:
pnpm prisma migrate deploy
```

The migration is idempotent (uses `IF NOT EXISTS`) so it's safe to run multiple times.

## Rollback

If you need to undo:

```sql
DROP TABLE IF EXISTS "RefreshToken";
ALTER TABLE "User" DROP COLUMN IF EXISTS "isActive";
ALTER TABLE "User" DROP COLUMN IF EXISTS "lastLoginAt";
```
