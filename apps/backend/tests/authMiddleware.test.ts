import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

// ── Module mocks (hoisted before imports) ─────────────────────────────────────

vi.mock('../src/auth/authService.js', () => ({
  verifyAccessToken: vi.fn(),
}));

import { verifyAccessToken } from '../src/auth/authService.js';
import { errorHandler } from '../src/errors/errorHandler.js';
import { requireAuth, requireAnyRole } from '../src/middleware/authMiddleware.js';
import type { UserRole } from '../src/auth/authTypes.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeAuthContext(role: UserRole) {
  return {
    access_token: `${role}-token`,
    auth_user_id: `auth-uuid-${role}`,
    user: {
      id: `user-uuid-${role}`,
      supabase_auth_user_id: `auth-uuid-${role}`,
      email: `${role}@example.com`,
      role,
      full_name: 'Test User',
      status: 'active' as const,
    },
  };
}

function buildApp(roles: UserRole[]) {
  const app = express();
  app.get('/test', requireAuth, requireAnyRole(roles), (_req, res) => {
    res.json({ data: { ok: true } });
  });
  app.use(errorHandler);
  return app;
}

// ── requireAnyRole ─────────────────────────────────────────────────────────────

describe('requireAnyRole', () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const app = buildApp(['student', 'parent']);

    const response = await request(app).get('/test');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: expect.any(String) });
    expect(response.body).not.toHaveProperty('data');
  });

  it('allows access when the authenticated role is in the allowed list', async () => {
    const app = buildApp(['student', 'parent']);
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(makeAuthContext('student'));

    const response = await request(app)
      .get('/test')
      .set('Authorization', 'Bearer student-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { ok: true } });
  });

  it('allows access for a second role in the allowed list', async () => {
    const app = buildApp(['student', 'parent']);
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(makeAuthContext('parent'));

    const response = await request(app)
      .get('/test')
      .set('Authorization', 'Bearer parent-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { ok: true } });
  });

  it('returns 403 when the authenticated role is not in the allowed list', async () => {
    const app = buildApp(['student', 'parent']);
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(makeAuthContext('teacher'));

    const response = await request(app)
      .get('/test')
      .set('Authorization', 'Bearer teacher-token');

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: expect.any(String) });
    expect(response.body).not.toHaveProperty('data');
  });

  it('returns 403 when admin is not in the allowed list', async () => {
    const app = buildApp(['student', 'parent']);
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(makeAuthContext('admin'));

    const response = await request(app)
      .get('/test')
      .set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(403);
    expect(response.body).not.toHaveProperty('data');
  });

  it('allows admin when admin is explicitly included in the allowed list', async () => {
    const app = buildApp(['student', 'parent', 'admin']);
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(makeAuthContext('admin'));

    const response = await request(app)
      .get('/test')
      .set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { ok: true } });
  });

  it('response never contains success: true', async () => {
    const app = buildApp(['student']);
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(makeAuthContext('student'));

    const response = await request(app)
      .get('/test')
      .set('Authorization', 'Bearer student-token');

    expect(response.body).not.toHaveProperty('success');
  });

  it('error response never contains success: true', async () => {
    const app = buildApp(['student']);
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(makeAuthContext('teacher'));

    const response = await request(app)
      .get('/test')
      .set('Authorization', 'Bearer teacher-token');

    expect(response.body).not.toHaveProperty('success');
  });
});
