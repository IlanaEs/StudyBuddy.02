import 'dotenv/config';
import { z } from 'zod';

// Optional string env var that treats an empty value ("") the same as unset.
// .env files commonly carry blank placeholders (e.g. GOOGLE_CLIENT_SECRET=);
// without this, an empty string would fail .min(1) and crash startup.
const optionalNonEmpty = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:3000'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  // Backend-owned Google Calendar OAuth. The backend exchanges the auth code
  // directly (not via Supabase linkIdentity), so it needs the client secret and
  // a redirect URI that points back to this server's callback route.
  GOOGLE_CLIENT_ID: optionalNonEmpty,
  GOOGLE_CLIENT_SECRET: optionalNonEmpty,
  GOOGLE_CALENDAR_REDIRECT_URI: z
    .string()
    .url()
    .default('http://localhost:4000/api/teachers/me/calendar/callback'),
  // base64-encoded 32-byte key for AES-256-GCM encryption of stored refresh tokens.
  CALENDAR_TOKEN_ENCRYPTION_KEY: optionalNonEmpty,
  // Secret for HMAC-signing the OAuth `state` param (carries the user id across
  // the unauthenticated callback). Defaults to the service role key if unset.
  CALENDAR_OAUTH_STATE_SECRET: optionalNonEmpty,
});

export const env = envSchema.parse(process.env);

export function requireEnv(name: keyof typeof env) {
  const value = env[name];

  if (!value) {
    throw new Error(`${name} is required for this operation`);
  }

  return String(value);
}
