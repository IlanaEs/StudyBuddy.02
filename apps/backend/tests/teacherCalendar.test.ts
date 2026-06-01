import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Module mocks (hoisted before imports) ─────────────────────────────────────

vi.mock('../src/auth/authService.js', () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock('../src/teachers/teacherCalendarRepository.js', () => ({
  getCalendarDraftFields: vi.fn(),
  saveCalendarSync: vi.fn(),
  clearCalendarData: vi.fn(),
}));

vi.mock('../src/teachers/teacherCalendarService.js', () => ({
  fetchGoogleBusySlots: vi.fn(),
}));

import { createApp } from '../src/app.js';
import { verifyAccessToken } from '../src/auth/authService.js';
import {
  getCalendarDraftFields,
  saveCalendarSync,
  clearCalendarData,
} from '../src/teachers/teacherCalendarRepository.js';
import { fetchGoogleBusySlots } from '../src/teachers/teacherCalendarService.js';

// ── Shared fixtures ────────────────────────────────────────────────────────────

const TEACHER_AUTH = {
  access_token: 'teacher-token',
  auth_user_id: 'auth-uuid-teacher',
  user: {
    id: 'user-uuid-teacher',
    supabase_auth_user_id: 'auth-uuid-teacher',
    email: 'teacher@example.com',
    role: 'teacher' as const,
    full_name: 'ישראל ישראלי',
    status: 'active' as const,
  },
};

const STUDENT_AUTH = {
  ...TEACHER_AUTH,
  access_token: 'student-token',
  user: { ...TEACHER_AUTH.user, role: 'student' as const },
};

const FAKE_BUSY_SLOTS = [
  { startAt: '2026-05-19T09:00:00Z', endAt: '2026-05-19T11:00:00Z', source: 'google_calendar' as const },
];

const FAKE_CALENDAR_DRAFT_CONNECTED = {
  profileId: 'profile-uuid',
  connected: true,
  lastSyncedAt: '2026-05-18T10:00:00Z',
  busySlots: FAKE_BUSY_SLOTS,
};

const FAKE_CALENDAR_DRAFT_NOT_CONNECTED = {
  profileId: 'profile-uuid',
  connected: false,
  lastSyncedAt: null,
  busySlots: [],
};

// ── GET /api/teachers/me/calendar/status ──────────────────────────────────────

describe('GET /api/teachers/me/calendar/status', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without a bearer token', async () => {
    const res = await request(createApp()).get('/api/teachers/me/calendar/status');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body).not.toHaveProperty('success');
    expect(res.body).not.toHaveProperty('data');
  });

  it('returns 403 for a non-teacher authenticated user', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(STUDENT_AUTH);

    const res = await request(createApp())
      .get('/api/teachers/me/calendar/status')
      .set('Authorization', 'Bearer student-token');

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(res.body).not.toHaveProperty('success');
  });

  it('returns 200 with not_connected status when no calendar data exists', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(TEACHER_AUTH);
    vi.mocked(getCalendarDraftFields).mockResolvedValueOnce(null);

    const res = await request(createApp())
      .get('/api/teachers/me/calendar/status')
      .set('Authorization', 'Bearer teacher-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { status: 'not_connected', lastSyncedAt: null } });
    expect(res.body).not.toHaveProperty('success');
  });

  it('returns 200 with connected status when calendar is connected', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(TEACHER_AUTH);
    vi.mocked(getCalendarDraftFields).mockResolvedValueOnce(FAKE_CALENDAR_DRAFT_CONNECTED);

    const res = await request(createApp())
      .get('/api/teachers/me/calendar/status')
      .set('Authorization', 'Bearer teacher-token');

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('connected');
    expect(res.body.data.lastSyncedAt).toBe('2026-05-18T10:00:00Z');
    expect(res.body).not.toHaveProperty('success');
  });
});

// ── POST /api/teachers/me/calendar/sync ──────────────────────────────────────

describe('POST /api/teachers/me/calendar/sync', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without a bearer token', async () => {
    const res = await request(createApp()).post('/api/teachers/me/calendar/sync');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body).not.toHaveProperty('success');
  });

  it('returns 403 for a non-teacher authenticated user', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(STUDENT_AUTH);

    const res = await request(createApp())
      .post('/api/teachers/me/calendar/sync')
      .set('Authorization', 'Bearer student-token');

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(res.body).not.toHaveProperty('success');
  });

  it('returns 400 when X-Provider-Token header is missing', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(TEACHER_AUTH);

    const res = await request(createApp())
      .post('/api/teachers/me/calendar/sync')
      .set('Authorization', 'Bearer teacher-token');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body).not.toHaveProperty('success');
  });

  it('returns 200 with busySlots, syncedAt, status, and busyCount on success', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(TEACHER_AUTH);
    vi.mocked(fetchGoogleBusySlots).mockResolvedValueOnce(FAKE_BUSY_SLOTS);
    vi.mocked(saveCalendarSync).mockResolvedValueOnce(undefined);

    const res = await request(createApp())
      .post('/api/teachers/me/calendar/sync')
      .set('Authorization', 'Bearer teacher-token')
      .set('X-Provider-Token', 'google-oauth-token');

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('connected');
    expect(res.body.data.busyCount).toBe(FAKE_BUSY_SLOTS.length);
    expect(res.body.data.busySlots).toEqual(FAKE_BUSY_SLOTS);
    expect(typeof res.body.data.syncedAt).toBe('string');
    expect(res.body).not.toHaveProperty('success');
    expect(vi.mocked(saveCalendarSync)).toHaveBeenCalledTimes(1);
  });

  it('returns 502 when Google Calendar API fails', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(TEACHER_AUTH);
    const { AppError } = await import('../src/errors/AppError.js');
    vi.mocked(fetchGoogleBusySlots).mockRejectedValueOnce(new AppError('Google Calendar API error: 500', 502));

    const res = await request(createApp())
      .post('/api/teachers/me/calendar/sync')
      .set('Authorization', 'Bearer teacher-token')
      .set('X-Provider-Token', 'expired-token');

    expect(res.status).toBe(502);
    expect(res.body).toHaveProperty('error');
    expect(res.body).not.toHaveProperty('success');
  });
});

// ── POST /api/teachers/me/calendar/disconnect ─────────────────────────────────

describe('POST /api/teachers/me/calendar/disconnect', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without a bearer token', async () => {
    const res = await request(createApp()).post('/api/teachers/me/calendar/disconnect');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body).not.toHaveProperty('success');
  });

  it('returns 403 for a non-teacher authenticated user', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(STUDENT_AUTH);

    const res = await request(createApp())
      .post('/api/teachers/me/calendar/disconnect')
      .set('Authorization', 'Bearer student-token');

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(res.body).not.toHaveProperty('success');
  });

  it('returns 200 with disconnected:true on success', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(TEACHER_AUTH);
    vi.mocked(clearCalendarData).mockResolvedValueOnce(undefined);

    const res = await request(createApp())
      .post('/api/teachers/me/calendar/disconnect')
      .set('Authorization', 'Bearer teacher-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { disconnected: true } });
    expect(res.body).not.toHaveProperty('success');
    expect(vi.mocked(clearCalendarData)).toHaveBeenCalledWith('user-uuid-teacher');
  });
});

// ── GET /api/teachers/me/calendar/busy-slots ─────────────────────────────────

describe('GET /api/teachers/me/calendar/busy-slots', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without a bearer token', async () => {
    const res = await request(createApp()).get('/api/teachers/me/calendar/busy-slots');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body).not.toHaveProperty('success');
  });

  it('returns 403 for a non-teacher authenticated user', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(STUDENT_AUTH);

    const res = await request(createApp())
      .get('/api/teachers/me/calendar/busy-slots')
      .set('Authorization', 'Bearer student-token');

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(res.body).not.toHaveProperty('success');
  });

  it('returns 200 with empty array when no slots cached', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(TEACHER_AUTH);
    vi.mocked(getCalendarDraftFields).mockResolvedValueOnce(null);

    const res = await request(createApp())
      .get('/api/teachers/me/calendar/busy-slots')
      .set('Authorization', 'Bearer teacher-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { busySlots: [] } });
    expect(res.body).not.toHaveProperty('success');
  });

  it('returns 200 with cached slots when calendar is connected', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(TEACHER_AUTH);
    vi.mocked(getCalendarDraftFields).mockResolvedValueOnce(FAKE_CALENDAR_DRAFT_CONNECTED);

    const res = await request(createApp())
      .get('/api/teachers/me/calendar/busy-slots')
      .set('Authorization', 'Bearer teacher-token');

    expect(res.status).toBe(200);
    expect(res.body.data.busySlots).toEqual(FAKE_BUSY_SLOTS);
    expect(res.body).not.toHaveProperty('success');
  });
});

// ── API contract: no { success: true } on any endpoint ───────────────────────

describe('API contract — no { success: true } on any endpoint', () => {
  beforeEach(() => vi.clearAllMocks());

  const endpoints = [
    { method: 'get', path: '/api/teachers/me/calendar/status' },
    { method: 'post', path: '/api/teachers/me/calendar/sync' },
    { method: 'post', path: '/api/teachers/me/calendar/disconnect' },
    { method: 'get', path: '/api/teachers/me/calendar/busy-slots' },
  ] as const;

  for (const { method, path } of endpoints) {
    it(`${method.toUpperCase()} ${path} — unauthenticated error is { error: string }`, async () => {
      const res = await request(createApp())[method](path);

      expect(res.status).toBe(401);
      expect(typeof res.body.error).toBe('string');
      expect(res.body).not.toHaveProperty('success');
      expect(res.body).not.toHaveProperty('data');
    });

    it(`${method.toUpperCase()} ${path} — forbidden error is { error: string }`, async () => {
      vi.mocked(verifyAccessToken).mockResolvedValue(STUDENT_AUTH);

      const res = await request(createApp())
        [method](path)
        .set('Authorization', 'Bearer student-token');

      expect(res.status).toBe(403);
      expect(typeof res.body.error).toBe('string');
      expect(res.body).not.toHaveProperty('success');
      expect(res.body).not.toHaveProperty('data');
    });
  }
});
