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
  HIDE_DEMO_TEACHERS: z.string().optional(),
  DEV_AUTH_BYPASS: z.string().optional(),
  // Render auto-sets RENDER_EXTERNAL_URL for web services; KEEP_ALIVE_URL is an
  // optional manual override. Used only to self-ping /health (keep the free-tier
  // instance warm) — see server.ts.
  RENDER_EXTERNAL_URL: z.string().url().optional(),
  KEEP_ALIVE_URL: z.string().url().optional(),
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
 * several teacher/student/parent accounts. **Default ON** (opt-out): multi-account
 * is the product behavior, so it's enabled unless explicitly disabled with
 * ENABLE_MULTI_ACCOUNT=false. This avoids the "feature silently off because an env
 * var wasn't set" failure mode.
 */
export const multiAccountEnabled = env.ENABLE_MULTI_ACCOUNT !== 'false';

/**
 * Whether to EXCLUDE demo/seed teachers (is_demo=true or
 * professional_status='dev_seed_teacher') from matching. **Opt-in** (default OFF)
 * so seeded demo teachers are matchable out of the box — a demo/staging DB whose
 * only teachers are seeded must still return matches. A real production deployment
 * with real teachers sets HIDE_DEMO_TEACHERS=true to keep seed data out of results.
 * (Previously this was tied to NODE_ENV=production, which silently returned zero
 * matches on the demo deployment.)
 */
export const hideDemoTeachersInMatching = env.HIDE_DEMO_TEACHERS === 'true';

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
