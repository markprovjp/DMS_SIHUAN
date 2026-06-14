-- Migration: add_refresh_token
-- Adds RefreshToken model + User.isActive / lastLoginAt fields
-- This migration is idempotent (safe to run multiple times).

-- Step 1: Add columns to User
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

-- Step 2: Create RefreshToken table
CREATE TABLE IF NOT EXISTS "RefreshToken" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "family"    TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "replacedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userAgent" TEXT,
  "ipAddress" TEXT,
  CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- Step 3: Unique constraint on tokenHash
CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- Step 4: Foreign key with cascade
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'RefreshToken_userId_fkey'
  ) THEN
    ALTER TABLE "RefreshToken"
      ADD CONSTRAINT "RefreshToken_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Step 5: Helpful indexes
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx"     ON "RefreshToken"("userId");
CREATE INDEX IF NOT EXISTS "RefreshToken_family_idx"     ON "RefreshToken"("family");
CREATE INDEX IF NOT EXISTS "RefreshToken_expiresAt_idx"  ON "RefreshToken"("expiresAt");
