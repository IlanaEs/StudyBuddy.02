import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:3000'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  ENABLE_ADMIN_QA_MODE: z.string().optional(),
});

export const env = envSchema.parse(process.env);

/** True only when explicitly opted in via ENABLE_ADMIN_QA_MODE=true. Never on by default. */
export const adminQaModeEnabled = env.ENABLE_ADMIN_QA_MODE === 'true';

export function requireEnv(name: keyof typeof env) {
  const value = env[name];

  if (!value) {
    throw new Error(`${name} is required for this operation`);
  }

  return String(value);
}
