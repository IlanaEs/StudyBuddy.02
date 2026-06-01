import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Module mocks (hoisted before imports) ─────────────────────────────────────

vi.mock('../src/auth/authService.js', () => ({
  verifyAccessToken: vi.fn(),
}));

// The live /api/teachers/me/onboarding handler is teacherOnboarding.controller →
// teacherOnboarding.service, which persists via this repository module.
vi.mock('../src/teacherOnboarding/teacherOnboarding.repository.js', () => ({
  getOnboardingDraftByUserId: vi.fn(),
  upsertOnboardingDraft: vi.fn(),
  upsertTeacherProfile: vi.fn(),
  updateUserFullName: vi.fn(),
  activateTeacherProfile: vi.fn(),
  replaceTeacherSubjects: vi.fn(),
  replaceTeacherAvailability: vi.fn(),
}));

// completeMyOnboarding validates academic-repository references via this module.
vi.mock('../src/academicRepositories/academicRepositories.repository.js', () => ({
  academicFieldExists: vi.fn(),
  academicInstitutionExists: vi.fn(),
  pendingRepositoryRequestExists: vi.fn(),
}));

import { createApp } from '../src/app.js';
import { verifyAccessToken } from '../src/auth/authService.js';
import {
  getOnboardingDraftByUserId,
  upsertOnboardingDraft,
  upsertTeacherProfile,
} from '../src/teacherOnboarding/teacherOnboarding.repository.js';
import type { OnboardingDraftRow } from '../src/teacherOnboarding/teacherOnboarding.types.js';

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

// An onboarding draft row as returned by the repository (matches OnboardingDraftRow).
// The service maps this to the API shape via toRemote(); note teacherProfileId is
// supplied by the service as '' for draft reads/saves (it is only resolved on complete).
const FAKE_DRAFT_ROW: OnboardingDraftRow = {
  id: 'draft-uuid',
  userId: 'user-uuid-teacher',
  onboardingStep: 1,
  onboardingCompleted: false,
  fullName: 'ישראל ישראלי',
  hourlyRate: 0,
  professionalStatus: null,
  legalTax: false,
  legalContractor: false,
  legalMinors: false,
  legalCommunity: false,
  draftData: null,
  createdAt: '2026-05-18T10:00:00Z',
  updatedAt: '2026-05-18T10:00:00Z',
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

// Stubs the repository calls completeMyOnboarding makes for a successful run.
// upsertTeacherProfile returns the profile id; the remaining writes are void.
function mockSuccessfulCompletion(profileId = 'profile-uuid') {
  vi.mocked(upsertOnboardingDraft).mockResolvedValue(FAKE_DRAFT_ROW);
  vi.mocked(upsertTeacherProfile).mockResolvedValue(profileId);
}

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
    vi.mocked(verifyAccessToken).mockResolvedValue(STUDENT_AUTH);

    const res = await request(createApp())
      .get('/api/teachers/me/onboarding')
      .set('Authorization', 'Bearer student-token');

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(res.body).not.toHaveProperty('success');
  });

  it('returns 200 with null onboarding when teacher has no draft yet', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(TEACHER_AUTH);
    vi.mocked(getOnboardingDraftByUserId).mockResolvedValue(null);

    const res = await request(createApp())
      .get('/api/teachers/me/onboarding')
      .set('Authorization', 'Bearer teacher-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { onboarding: null } });
    expect(res.body).not.toHaveProperty('success');
  });

  it('returns 200 with onboarding state when teacher has an existing draft', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(TEACHER_AUTH);
    vi.mocked(getOnboardingDraftByUserId).mockResolvedValue(FAKE_DRAFT_ROW);

    const res = await request(createApp())
      .get('/api/teachers/me/onboarding')
      .set('Authorization', 'Bearer teacher-token');

    expect(res.status).toBe(200);
    expect(res.body.data.onboarding).toMatchObject({
      onboardingStep: 1,
      onboardingCompleted: false,
      fullName: 'ישראל ישראלי',
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
      .send({ fullName: 'ישראל', onboardingStep: 1 });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 403 for a non-teacher authenticated user', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(STUDENT_AUTH);

    const res = await request(createApp())
      .put('/api/teachers/me/onboarding')
      .set('Authorization', 'Bearer student-token')
      .send({ fullName: 'ישראל', onboardingStep: 1 });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 200 for a valid partial save', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(TEACHER_AUTH);
    vi.mocked(upsertOnboardingDraft).mockResolvedValue(FAKE_DRAFT_ROW);

    const res = await request(createApp())
      .put('/api/teachers/me/onboarding')
      .set('Authorization', 'Bearer teacher-token')
      .send({ onboardingStep: 1 });

    expect(res.status).toBe(200);
    expect(res.body.data.onboarding).toMatchObject({ onboardingStep: 1 });
    expect(res.body).not.toHaveProperty('success');
  });

  it('returns 422 when onboardingStep is missing (required field)', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(TEACHER_AUTH);

    const res = await request(createApp())
      .put('/api/teachers/me/onboarding')
      .set('Authorization', 'Bearer teacher-token')
      .send({ fullName: 'ישראל' });

    expect(res.status).toBe(422);
    expect(res.body).toEqual({ error: 'Request validation failed' });
  });

  it('returns 200 with updated onboarding state after a partial save', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(TEACHER_AUTH);
    vi.mocked(upsertOnboardingDraft).mockResolvedValue({
      ...FAKE_DRAFT_ROW,
      onboardingStep: 3,
      fullName: 'ישראל ישראלי',
    });

    const res = await request(createApp())
      .put('/api/teachers/me/onboarding')
      .set('Authorization', 'Bearer teacher-token')
      .send({ fullName: 'ישראל ישראלי', onboardingStep: 3 });

    expect(res.status).toBe(200);
    expect(res.body.data.onboarding.onboardingStep).toBe(3);
  });

  it('returns 422 when hourlyRate fails the numeric format check', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(TEACHER_AUTH);

    const res = await request(createApp())
      .put('/api/teachers/me/onboarding')
      .set('Authorization', 'Bearer teacher-token')
      .send({ onboardingStep: 1, hourlyRate: 'not-a-number' });

    expect(res.status).toBe(422);
    expect(res.body).toEqual({ error: 'Request validation failed' });
  });

  it('response never contains success:true', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(TEACHER_AUTH);
    vi.mocked(upsertOnboardingDraft).mockResolvedValue(FAKE_DRAFT_ROW);

    const res = await request(createApp())
      .put('/api/teachers/me/onboarding')
      .set('Authorization', 'Bearer teacher-token')
      .send({ onboardingStep: 1 });

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
    vi.mocked(verifyAccessToken).mockResolvedValue(STUDENT_AUTH);

    const res = await request(createApp())
      .post('/api/teachers/me/onboarding/complete')
      .set('Authorization', 'Bearer student-token')
      .send(VALID_COMPLETE_BODY);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  // NOTE: In the current schema the legal declarations are optional booleans, so a
  // false flag passes validation and completion proceeds. (The old implementation
  // hard-required all legal flags to be true. Flagged for product review.)
  it('completes (200) even when a legal declaration is false — legal flags are optional', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(TEACHER_AUTH);
    mockSuccessfulCompletion();

    const res = await request(createApp())
      .post('/api/teachers/me/onboarding/complete')
      .set('Authorization', 'Bearer teacher-token')
      .send({ ...VALID_COMPLETE_BODY, legalTax: false });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ teacherProfileId: 'profile-uuid', nextRoute: '/dashboard' });
  });

  it('returns 422 when fullName is missing', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(TEACHER_AUTH);
    const { fullName: _omitted, ...bodyWithoutName } = VALID_COMPLETE_BODY;

    const res = await request(createApp())
      .post('/api/teachers/me/onboarding/complete')
      .set('Authorization', 'Bearer teacher-token')
      .send(bodyWithoutName);

    expect(res.status).toBe(422);
    expect(res.body).toEqual({ error: 'Request validation failed' });
  });

  it('returns 422 when hourlyRate is missing', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(TEACHER_AUTH);
    const { hourlyRate: _omitted, ...bodyWithoutRate } = VALID_COMPLETE_BODY;

    const res = await request(createApp())
      .post('/api/teachers/me/onboarding/complete')
      .set('Authorization', 'Bearer teacher-token')
      .send(bodyWithoutRate);

    expect(res.status).toBe(422);
    expect(res.body).toEqual({ error: 'Request validation failed' });
  });

  it('returns 200 on first successful completion', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(TEACHER_AUTH);
    mockSuccessfulCompletion();

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

  // The current service has no "already completed" short-circuit; completion is
  // idempotent because the underlying writes are upserts. Re-running returns the
  // same result.
  it('is idempotent — re-running completion returns the same result', async () => {
    const app = createApp();
    vi.mocked(verifyAccessToken).mockResolvedValue(TEACHER_AUTH);
    mockSuccessfulCompletion();

    const firstRes = await request(app)
      .post('/api/teachers/me/onboarding/complete')
      .set('Authorization', 'Bearer teacher-token')
      .send(VALID_COMPLETE_BODY);

    const secondRes = await request(app)
      .post('/api/teachers/me/onboarding/complete')
      .set('Authorization', 'Bearer teacher-token')
      .send(VALID_COMPLETE_BODY);

    expect(firstRes.status).toBe(200);
    expect(secondRes.status).toBe(200);
    expect(secondRes.body.data).toMatchObject({
      teacherProfileId: 'profile-uuid',
      nextRoute: '/dashboard',
    });
    expect(secondRes.body.data).toEqual(firstRes.body.data);
  });

  it('response never contains success:true on completion', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(TEACHER_AUTH);
    mockSuccessfulCompletion();

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
      vi.mocked(verifyAccessToken).mockResolvedValue(STUDENT_AUTH);

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
