/**
 * Centralized env config with fail-fast behavior.
 *
 * In production (`NODE_ENV=production`), missing required secrets throw on boot
 * instead of falling back to unsafe defaults. In dev/test we keep the previous
 * behavior (fallback to a dev-only secret) so local onboarding stays smooth.
 */
const IS_PROD = process.env.NODE_ENV === "production";

/** Names of env keys whose values must never appear in logs/responses. */
const SECRET_KEYS = new Set([
  "JWT_SECRET",
  "AI_API_KEY",
  "OPENAI_API_KEY",
  "MOBIWORK_TOKEN",
  "DATABASE_URL",
  "REDIS_URL",
]);

export function isSecretKey(key: string): boolean {
  return SECRET_KEYS.has(key);
}

function requireInProd(key: string): string | undefined {
  const v = process.env[key];
  if (!v && IS_PROD) {
    throw new Error(
      `[config] Missing required env var "${key}" in production. ` +
        `Refusing to start. Set it via your secret manager or .env.production.`,
    );
  }
  return v;
}

/** Returns the JWT secret. In prod it MUST be set; otherwise throws. */
export function getJwtSecret(): string {
  const v = requireInProd("JWT_SECRET");
  if (v) return v;
  // Dev-only fallback. Clearly marked as unsafe.
  return "dms_ai_admin_dev_only_secret_do_not_use_in_prod";
}

/** JWT access token lifetime. Short in prod, longer in dev for ergonomics. */
export function getJwtExpiresIn(): string {
  return IS_PROD ? "15m" : "1d";
}

/** Database URL — required in prod. */
export function getDatabaseUrl(): string {
  const v = requireInProd("DATABASE_URL");
  return v || "postgresql://postgres:postgres@localhost:5432/dms_ai_admin";
}

/** App base URL for CORS allowlist (comma-separated). */
export function getAppUrls(): string[] {
  const v = process.env.APP_URL;
  if (v)
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  return ["http://localhost:5173"];
}

/** Mask a secret value for display: keep first 4 + last 2 chars, rest → *. */
export function maskSecret(value: string | null | undefined): {
  configured: boolean;
  masked: string;
} {
  if (!value) return { configured: false, masked: "" };
  if (value.length <= 8) {
    return { configured: true, masked: "*".repeat(value.length) };
  }
  return {
    configured: true,
    masked:
      value.slice(0, 4) +
      "*".repeat(Math.max(4, value.length - 6)) +
      value.slice(-2),
  };
}

/** Recursively mask any string values whose key matches SECRET_KEYS.
 *  Used before logging objects or returning them in error responses. */
export function maskSecretsDeep<T>(input: T): T {
  if (input == null) return input;
  if (Array.isArray(input)) {
    return input.map((v) => maskSecretsDeep(v)) as unknown as T;
  }
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (typeof v === "string" && SECRET_KEYS.has(k)) {
        out[k] = maskSecret(v);
      } else {
        out[k] = maskSecretsDeep(v);
      }
    }
    return out as T;
  }
  return input;
}
