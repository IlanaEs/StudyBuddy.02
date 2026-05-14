import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:3000'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);

export function requireEnv(name: keyof typeof env) {
  const value = env[name];

  if (!value) {
    throw new Error(`${name} is required for this operation`);
  }

  return String(value);
}
