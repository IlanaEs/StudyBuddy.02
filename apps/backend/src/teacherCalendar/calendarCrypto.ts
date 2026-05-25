import crypto from 'node:crypto';

import { env, requireEnv } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

// ── Refresh-token encryption (AES-256-GCM) ──────────────────────────────────────
// Stored format: base64(iv).base64(authTag).base64(ciphertext)

function getEncryptionKey(): Buffer {
  const raw = requireEnv('CALENDAR_TOKEN_ENCRYPTION_KEY');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new AppError('CALENDAR_TOKEN_ENCRYPTION_KEY must be base64-encoded 32 bytes', 500);
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join('.');
}

export function decryptSecret(payload: string): string {
  const key = getEncryptionKey();
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new AppError('Malformed encrypted secret', 500);
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

// ── OAuth state signing (HMAC-SHA256) ───────────────────────────────────────────
// The callback is unauthenticated (a browser redirect from Google), so the
// authenticated user id is carried in a tamper-evident, expiring `state` token.
// Format: base64url(json).base64url(hmac)

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

type StatePayload = { uid: string; nonce: string; exp: number };

function getStateSecret(): string {
  return env.CALENDAR_OAUTH_STATE_SECRET ?? requireEnv('SUPABASE_SERVICE_ROLE_KEY');
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function hmac(data: string): string {
  return b64url(crypto.createHmac('sha256', getStateSecret()).update(data).digest());
}

export function signOAuthState(userId: string): string {
  const payload: StatePayload = {
    uid: userId,
    nonce: crypto.randomBytes(8).toString('hex'),
    exp: Date.now() + STATE_TTL_MS,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  return `${body}.${hmac(body)}`;
}

// Returns the user id if the state is authentic and unexpired, otherwise null.
export function verifyOAuthState(state: string): string | null {
  const [body, sig] = state.split('.');
  if (!body || !sig) return null;

  const expected = hmac(body);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    ) as StatePayload;
    if (typeof payload.uid !== 'string' || typeof payload.exp !== 'number') return null;
    if (Date.now() > payload.exp) return null;
    return payload.uid;
  } catch {
    return null;
  }
}
