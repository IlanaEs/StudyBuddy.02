import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().min(1).default('http://localhost:3001'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  ENABLE_ADMIN_QA_MODE: z.string().optional(),
  ENABLE_MULTI_ACCOUNT: z.string().optional(),
  DEV_AUTH_BYPASS: z.string().optional(),
});

export const env = envSchema.parse(process.env);

/**
 * Allowed frontend origins for CORS. Supports a single URL or comma-separated list.
 * Always includes both localhost and 127.0.0.1 variants for the configured port(s)
 * so that origin mismatches between the two never cause CORS failures.
 */
export const allowedOrigins: string[] = (() => {
  const raw = env.FRONTEND_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
  const origins = new Set<string>();
  for (const origin of raw) {
    origins.add(origin);
    // Auto-add the mirror origin so localhost ↔ 127.0.0.1 mismatches are covered.
    try {
      const url = new URL(origin);
      if (url.hostname === 'localhost') {
        url.hostname = '127.0.0.1';
        origins.add(url.origin);
      } else if (url.hostname === '127.0.0.1') {
        url.hostname = 'localhost';
        origins.add(url.origin);
      }
    } catch { /* non-URL value — keep as-is */ }
  }
  return [...origins];
})();

/** True only when explicitly opted in via ENABLE_ADMIN_QA_MODE=true. Never on by default. */
export const adminQaModeEnabled = env.ENABLE_ADMIN_QA_MODE === 'true';

/**
 * Gates multi-account creation (POST /api/accounts) — one Google login owning
 * several teacher/student/parent accounts. Off by default; the schema + active-
 * account resolution ship dormant, and only this flag exposes account creation.
 */
export const multiAccountEnabled = env.ENABLE_MULTI_ACCOUNT === 'true';

/**
 * Local QA signup bypass: auto-confirms new sign-ups so onboarding/signup can be
 * tested without relying on Supabase email delivery.
 * Hard double-gate — never active in production, and requires explicit opt-in via
 * DEV_AUTH_BYPASS=true. Production keeps NODE_ENV=production and must never set it.
 */
export const devAuthBypassEnabled =
  env.NODE_ENV !== 'production' && env.DEV_AUTH_BYPASS === 'true';

export function requireEnv(name: keyof typeof env) {
  const value = env[name];

  if (!value) {
    throw new Error(`${name} is required for this operation`);
  }

  return String(value);
}
