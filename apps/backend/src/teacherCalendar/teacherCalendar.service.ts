// Business logic: backend-owned Google Calendar OAuth + Freebusy sync.
// The backend exchanges the auth code itself, stores the (encrypted) refresh
// token, and is the single source of truth for connection state.

import { env, requireEnv } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { decryptSecret, encryptSecret, signOAuthState, verifyOAuthState } from './calendarCrypto.js';
import type { BusySlotRow } from './teacherCalendar.repository.js';
import {
  clearConnection,
  getConnectionByUserId,
  updateBusySlots,
  upsertConnection,
} from './teacherCalendar.repository.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_FREEBUSY_URL = 'https://www.googleapis.com/calendar/v3/freeBusy';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const SYNC_WINDOW_DAYS = 28;

const isDev = process.env['NODE_ENV'] !== 'production';

// ── OAuth URL ───────────────────────────────────────────────────────────────────

export function buildConnectUrl(userId: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv('GOOGLE_CLIENT_ID'),
    redirect_uri: env.GOOGLE_CALENDAR_REDIRECT_URI,
    response_type: 'code',
    scope: CALENDAR_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: signOAuthState(userId),
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

// ── Google token + freebusy calls ───────────────────────────────────────────────

type GoogleTokenResponse = { access_token?: string; refresh_token?: string; expires_in?: number };

async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
      redirect_uri: env.GOOGLE_CALENDAR_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    if (isDev) console.error('[teacherCalendar] code exchange failed', res.status, await res.text().catch(() => ''));
    throw new AppError('Google token exchange failed', 502);
  }
  return (await res.json()) as GoogleTokenResponse;
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    if (isDev) console.error('[teacherCalendar] token refresh failed', res.status, await res.text().catch(() => ''));
    throw new AppError('Google token refresh failed', 502);
  }
  const body = (await res.json()) as GoogleTokenResponse;
  if (!body.access_token) throw new AppError('Google token refresh returned no access token', 502);
  return body.access_token;
}

type FreeBusyItem = { start?: string; end?: string };
type FreeBusyResponse = { calendars?: Record<string, { busy?: FreeBusyItem[] }> };

async function fetchFreeBusy(accessToken: string): Promise<BusySlotRow[]> {
  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const res = await fetch(GOOGLE_FREEBUSY_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ timeMin, timeMax, items: [{ id: 'primary' }] }),
  });

  if (!res.ok) {
    if (isDev) console.error('[teacherCalendar] freeBusy failed', res.status, await res.text().catch(() => ''));
    throw new AppError('Google Calendar freebusy request failed', 502);
  }

  const body = (await res.json()) as FreeBusyResponse;
  const busy = body.calendars?.['primary']?.busy ?? [];
  return busy
    .filter((b): b is Required<FreeBusyItem> => Boolean(b.start && b.end))
    .map((b) => ({ startAt: b.start, endAt: b.end, source: 'google_calendar' as const }));
}

// ── Callback: validate state → exchange → freebusy → persist ─────────────────────
// Returns the user id on success; throws on any failure so the controller can
// redirect to the frontend failure URL.

export async function handleCallback(code: string, state: string): Promise<string> {
  const userId = verifyOAuthState(state);
  if (!userId) throw new AppError('Invalid or expired OAuth state', 400);

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens.access_token) throw new AppError('Google did not return an access token', 502);

  const busySlots = await fetchFreeBusy(tokens.access_token);
  const now = new Date().toISOString();

  await upsertConnection(userId, {
    connected: true,
    connectedAt: now,
    // Google omits refresh_token unless prompt=consent forced it; persist when present.
    refreshTokenEncrypted: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null,
    busySlots,
    lastSyncedAt: now,
  });

  return userId;
}

// ── Authenticated reads/actions ──────────────────────────────────────────────────

export async function getStatusService(userId: string) {
  const conn = await getConnectionByUserId(userId);
  return { status: conn?.connected ? ('connected' as const) : ('not_connected' as const) };
}

export async function getBusySlotsService(userId: string) {
  const conn = await getConnectionByUserId(userId);
  return { busySlots: conn?.connected ? conn.busySlots : [] };
}

export async function disconnectService(userId: string) {
  await clearConnection(userId);
  return { disconnected: true };
}

// Re-sync busy slots using the stored refresh token — no reconnect needed.
export async function syncService(userId: string) {
  const conn = await getConnectionByUserId(userId);
  if (!conn?.connected || !conn.refreshTokenEncrypted) {
    throw new AppError('Calendar is not connected', 409);
  }
  const accessToken = await refreshAccessToken(decryptSecret(conn.refreshTokenEncrypted));
  const busySlots = await fetchFreeBusy(accessToken);
  await updateBusySlots(userId, busySlots, new Date().toISOString());
  return { busySlots };
}
