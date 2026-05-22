import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Module mocks (hoisted before imports) ─────────────────────────────────────

vi.mock('../src/auth/authService.js', () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock('../src/teachers/teacherRepository.js', () => ({
  findTeacherProfileByUserId: vi.fn(),
  saveOnboardingDraft: vi.fn(),
  completeOnboarding: vi.fn(),
  upsertTeacherProfile: vi.fn(),
}));

import { createApp } from '../src/app.js';
import { verifyAccessToken } from '../src/auth/authService.js';
import {
  completeOnboarding as repoComplete,
  findTeacherProfileByUserId,
  saveOnboardingDraft as repoSave,
} from '../src/teachers/teacherRepository.js';

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

const FAKE_ONBOARDING_STATE = {
  teacherProfileId: 'profile-uuid',
  fullName: 'ישראל ישראלי',
  hourlyRate: 0,
  professionalStatus: null,
  onboardingStep: 1,
  onboardingCompleted: false,
  legalTax: false,
  legalContractor: false,
  legalMinors: false,
  legalCommunity: false,
  draft: null,
};

const FAKE_ONBOARDING_COMPLETED = {
  ...FAKE_ONBOARDING_STATE,
  hourlyRate: 150,
  onboardingStep: 8,
  onboardingCompleted: true,
  legalTax: true,
  legalContractor: true,
  legalMinors: true,
  legalCommunity: true,
};

const VALID_COMPLETE_BODY = {
  fullName: 'ישראל ישראלי',
  hourlyRate: '150',
  professionalStatus: 'מורה מוסמך',
  legalTax: true,
  legalContractor: true,
  legalMinors: true,
  legalCommunity: true,
  draft: {
    teachingLevels: ['תיכון'],
    selectedSubjects: ['מתמטיקה'],
    weeklyAvailability: ['ראשון', 'שני'],
  },
};

// ── GET /api/teachers/me/onboarding ───────────────────────────────────────────

describe('GET /api/teachers/me/onboarding', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without a bearer token', async () => {
    const res = await request(createApp()).get('/api/teachers/me/onboarding');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body).not.toHaveProperty('success');
    expect(res.body).not.toHaveProperty('data');
  });

  it('returns 403 for a non-teacher authenticated user', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(STUDENT_AUTH);

    const res = await request(createApp())
      .get('/api/teachers/me/onboarding')
      .set('Authorization', 'Bearer student-token');

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(res.body).not.toHaveProperty('success');
  });

  it('returns 200 with null onboarding when teacher has no profile yet', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(TEACHER_AUTH);
    vi.mocked(findTeacherProfileByUserId).mockResolvedValueOnce(null);

    const res = await request(createApp())
      .get('/api/teachers/me/onboarding')
      .set('Authorization', 'Bearer teacher-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { onboarding: null } });
    expect(res.body).not.toHaveProperty('success');
  });

  it('returns 200 with onboarding state when teacher has an existing profile', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(TEACHER_AUTH);
    vi.mocked(findTeacherProfileByUserId).mockResolvedValueOnce(FAKE_ONBOARDING_STATE);

    const res = await request(createApp())
      .get('/api/teachers/me/onboarding')
      .set('Authorization', 'Bearer teacher-token');

    expect(res.status).toBe(200);
    expect(res.body.data.onboarding).toMatchObject({
      teacherProfileId: 'profile-uuid',
      onboardingCompleted: false,
    });
    expect(res.body).not.toHaveProperty('success');
  });
});

// ── PUT /api/teachers/me/onboarding ───────────────────────────────────────────

describe('PUT /api/teachers/me/onboarding', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without a bearer token', async () => {
    const res = await request(createApp())
      .put('/api/teachers/me/onboarding')
      .send({ fullName: 'ישראל' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 403 for a non-teacher authenticated user', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(STUDENT_AUTH);

    const res = await request(createApp())
      .put('/api/teachers/me/onboarding')
      .set('Authorization', 'Bearer student-token')
      .send({ fullName: 'ישראל' });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 200 for a valid partial save (empty body is allowed)', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(TEACHER_AUTH);
    vi.mocked(repoSave).mockResolvedValueOnce(FAKE_ONBOARDING_STATE);

    const res = await request(createApp())
      .put('/api/teachers/me/onboarding')
      .set('Authorization', 'Bearer teacher-token')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.onboarding).toMatchObject({ teacherProfileId: 'profile-uuid' });
    expect(res.body).not.toHaveProperty('success');
  });

  it('returns 200 with updated onboarding state after a partial save', async () => {
    const updatedState = { ...FAKE_ONBOARDING_STATE, onboardingStep: 3, fullName: 'ישראל ישראלי' };
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(TEACHER_AUTH);
    vi.mocked(repoSave).mockResolvedValueOnce(updatedState);

    const res = await request(createApp())
      .put('/api/teachers/me/onboarding')
      .set('Authorization', 'Bearer teacher-token')
      .send({ fullName: 'ישראל ישראלי', onboardingStep: 3 });

    expect(res.status).toBe(200);
    expect(res.body.data.onboarding.onboardingStep).toBe(3);
  });

  it('returns 422 when hourlyRate fails the numeric format check', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(TEACHER_AUTH);

    const res = await request(createApp())
      .put('/api/teachers/me/onboarding')
      .set('Authorization', 'Bearer teacher-token')
      .send({ hourlyRate: 'not-a-number' });

    expect(res.status).toBe(422);
    expect(res.body).toEqual({ error: 'Request validation failed' });
  });

  it('response never contains success:true', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(TEACHER_AUTH);
    vi.mocked(repoSave).mockResolvedValueOnce(FAKE_ONBOARDING_STATE);

    const res = await request(createApp())
      .put('/api/teachers/me/onboarding')
      .set('Authorization', 'Bearer teacher-token')
      .send({});

    expect(res.body).not.toHaveProperty('success');
  });
});

// ── POST /api/teachers/me/onboarding/complete ─────────────────────────────────

describe('POST /api/teachers/me/onboarding/complete', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without a bearer token', async () => {
    const res = await request(createApp())
      .post('/api/teachers/me/onboarding/complete')
      .send(VALID_COMPLETE_BODY);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 403 for a non-teacher authenticated user', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(STUDENT_AUTH);

    const res = await request(createApp())
      .post('/api/teachers/me/onboarding/complete')
      .set('Authorization', 'Bearer student-token')
      .send(VALID_COMPLETE_BODY);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 422 when legal declarations are not all true', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(TEACHER_AUTH);

    const res = await request(createApp())
      .post('/api/teachers/me/onboarding/complete')
      .set('Authorization', 'Bearer teacher-token')
      .send({ ...VALID_COMPLETE_BODY, legalTax: false });

    expect(res.status).toBe(422);
    expect(res.body).toEqual({ error: 'Request validation failed' });
  });

  it('returns 422 when fullName is missing', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(TEACHER_AUTH);
    const { fullName: _omitted, ...bodyWithoutName } = VALID_COMPLETE_BODY;

    const res = await request(createApp())
      .post('/api/teachers/me/onboarding/complete')
      .set('Authorization', 'Bearer teacher-token')
      .send(bodyWithoutName);

    expect(res.status).toBe(422);
    expect(res.body).toEqual({ error: 'Request validation failed' });
  });

  it('returns 422 when hourlyRate is missing', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(TEACHER_AUTH);
    const { hourlyRate: _omitted, ...bodyWithoutRate } = VALID_COMPLETE_BODY;

    const res = await request(createApp())
      .post('/api/teachers/me/onboarding/complete')
      .set('Authorization', 'Bearer teacher-token')
      .send(bodyWithoutRate);

    expect(res.status).toBe(422);
    expect(res.body).toEqual({ error: 'Request validation failed' });
  });

  it('returns 200 on first successful completion', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(TEACHER_AUTH);
    vi.mocked(findTeacherProfileByUserId).mockResolvedValueOnce(FAKE_ONBOARDING_STATE);
    vi.mocked(repoComplete).mockResolvedValueOnce({ teacherProfileId: 'profile-uuid' });

    const res = await request(createApp())
      .post('/api/teachers/me/onboarding/complete')
      .set('Authorization', 'Bearer teacher-token')
      .send(VALID_COMPLETE_BODY);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      teacherProfileId: 'profile-uuid',
      nextRoute: '/dashboard',
    });
    expect(res.body).not.toHaveProperty('success');
  });

  it('is idempotent — second request returns existing profile without re-running writes', async () => {
    const app = createApp();

    // First call: not yet completed → runs completion
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(TEACHER_AUTH);
    vi.mocked(findTeacherProfileByUserId).mockResolvedValueOnce(FAKE_ONBOARDING_STATE);
    vi.mocked(repoComplete).mockResolvedValueOnce({ teacherProfileId: 'profile-uuid' });

    const firstRes = await request(app)
      .post('/api/teachers/me/onboarding/complete')
      .set('Authorization', 'Bearer teacher-token')
      .send(VALID_COMPLETE_BODY);

    expect(firstRes.status).toBe(200);
    expect(vi.mocked(repoComplete)).toHaveBeenCalledTimes(1);

    // Second call: already completed → short-circuits without calling repoComplete again
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(TEACHER_AUTH);
    vi.mocked(findTeacherProfileByUserId).mockResolvedValueOnce(FAKE_ONBOARDING_COMPLETED);

    const secondRes = await request(app)
      .post('/api/teachers/me/onboarding/complete')
      .set('Authorization', 'Bearer teacher-token')
      .send(VALID_COMPLETE_BODY);

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.data).toMatchObject({
      teacherProfileId: 'profile-uuid',
      nextRoute: '/dashboard',
    });
    // repoComplete must NOT have been called again
    expect(vi.mocked(repoComplete)).toHaveBeenCalledTimes(1);
  });

  it('completed profile remains consistent — idempotent response matches first response', async () => {
    const app = createApp();

    vi.mocked(verifyAccessToken).mockResolvedValueOnce(TEACHER_AUTH);
    vi.mocked(findTeacherProfileByUserId).mockResolvedValueOnce(FAKE_ONBOARDING_STATE);
    vi.mocked(repoComplete).mockResolvedValueOnce({ teacherProfileId: 'profile-uuid' });
    const firstRes = await request(app)
      .post('/api/teachers/me/onboarding/complete')
      .set('Authorization', 'Bearer teacher-token')
      .send(VALID_COMPLETE_BODY);

    vi.mocked(verifyAccessToken).mockResolvedValueOnce(TEACHER_AUTH);
    vi.mocked(findTeacherProfileByUserId).mockResolvedValueOnce(FAKE_ONBOARDING_COMPLETED);
    const secondRes = await request(app)
      .post('/api/teachers/me/onboarding/complete')
      .set('Authorization', 'Bearer teacher-token')
      .send(VALID_COMPLETE_BODY);

    expect(firstRes.body.data.teacherProfileId).toBe(secondRes.body.data.teacherProfileId);
    expect(firstRes.body.data.nextRoute).toBe(secondRes.body.data.nextRoute);
  });

  it('response never contains success:true on completion', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(TEACHER_AUTH);
    vi.mocked(findTeacherProfileByUserId).mockResolvedValueOnce(FAKE_ONBOARDING_STATE);
    vi.mocked(repoComplete).mockResolvedValueOnce({ teacherProfileId: 'profile-uuid' });

    const res = await request(createApp())
      .post('/api/teachers/me/onboarding/complete')
      .set('Authorization', 'Bearer teacher-token')
      .send(VALID_COMPLETE_BODY);

    expect(res.body).not.toHaveProperty('success');
    expect(res.body).toHaveProperty('data');
  });
});

// ── API contract: error shape consistency ─────────────────────────────────────

describe('API contract — all endpoints', () => {
  beforeEach(() => vi.clearAllMocks());

  const endpoints = [
    { method: 'get', path: '/api/teachers/me/onboarding' },
    { method: 'put', path: '/api/teachers/me/onboarding' },
    { method: 'post', path: '/api/teachers/me/onboarding/complete' },
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
      vi.mocked(verifyAccessToken).mockResolvedValueOnce(STUDENT_AUTH);

      const res = await request(createApp())
        [method](path)
        .set('Authorization', 'Bearer student-token')
        .send(VALID_COMPLETE_BODY);

      expect(res.status).toBe(403);
      expect(typeof res.body.error).toBe('string');
      expect(res.body).not.toHaveProperty('success');
      expect(res.body).not.toHaveProperty('data');
    });
  }
});
