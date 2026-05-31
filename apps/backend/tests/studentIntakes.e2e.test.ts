import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Module mocks (hoisted before imports) ─────────────────────────────────────

vi.mock('../src/auth/authService.js', () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock('../src/auth/ownership.js', () => ({
  assertStudentAccess: vi.fn(),
}));

vi.mock('../src/studentIntakes/studentIntakes.repository.js', () => ({
  createStudentIntake: vi.fn(),
  getStudentIntakeById: vi.fn(),
}));

vi.mock('../src/matching/matching.repository.js', () => ({
  getStudentIntakeById: vi.fn(),
  findInitialTeacherCandidates: vi.fn(),
  replaceMatchResults: vi.fn(),
}));

vi.mock('../src/db/transaction.js', () => ({
  withTransaction: vi.fn((fn: (sql: unknown) => Promise<unknown>) => fn({})),
}));

import { createApp } from '../src/app.js';
import { verifyAccessToken } from '../src/auth/authService.js';
import { assertStudentAccess } from '../src/auth/ownership.js';
import { AppError } from '../src/errors/AppError.js';
import { createStudentIntake } from '../src/studentIntakes/studentIntakes.repository.js';
import {
  findInitialTeacherCandidates,
  getStudentIntakeById as matchingGetStudentIntakeById,
  replaceMatchResults,
} from '../src/matching/matching.repository.js';
import { withTransaction } from '../src/db/transaction.js';
import type { IntakeWithContext, MatchCandidate } from '../src/matching/matching.types.js';

// ── Auth fixtures ──────────────────────────────────────────────────────────────

const STUDENT_ID = 'e2ea0002-0000-4000-8000-000000000002';
const PARENT_ID  = 'e2ea0001-0000-4000-8000-000000000001';
const SUBJECT_ID = 'e2ea0099-0000-4000-8000-000000000001';
const INTAKE_ID  = 'e2ea0088-0000-4000-8000-000000000001';

const STUDENT_AUTH = {
  access_token: 'student-token',
  auth_user_id: 'auth-student',
  user: {
    id: 'e2ea0001-0000-4000-8000-000000000002',
    supabase_auth_user_id: 'auth-student',
    email: 'e2e-student@studybuddy.local',
    role: 'student' as const,
    full_name: 'תלמיד E2E',
    status: 'active' as const,
  },
};

const PARENT_AUTH = {
  access_token: 'parent-token',
  auth_user_id: 'auth-parent',
  user: {
    id: PARENT_ID,
    supabase_auth_user_id: 'auth-parent',
    email: 'e2e-parent@studybuddy.local',
    role: 'parent' as const,
    full_name: 'הורה E2E',
    status: 'active' as const,
  },
};

const TEACHER_AUTH = {
  access_token: 'teacher-token',
  auth_user_id: 'auth-teacher',
  user: {
    id: 'e2ea0001-0000-4000-8000-000000000010',
    supabase_auth_user_id: 'auth-teacher',
    email: 'e2e-teacher1@studybuddy.local',
    role: 'teacher' as const,
    full_name: 'מורה E2E',
    status: 'active' as const,
  },
};

// ── Data builders ──────────────────────────────────────────────────────────────

function makeIntakeSummary(overrides: Partial<{ id: string; studentId: string; status: string }> = {}) {
  return {
    id: overrides.id ?? INTAKE_ID,
    studentId: overrides.studentId ?? STUDENT_ID,
    subjectId: SUBJECT_ID,
    status: (overrides.status ?? 'open') as 'open' | 'matched' | 'closed',
  };
}

function makeIntakeWithContext(intakeId: string): IntakeWithContext {
  return {
    id: intakeId,
    studentId: STUDENT_ID,
    createdByUserId: STUDENT_AUTH.user.id,
    subjectId: SUBJECT_ID,
    level: 'high',
    goal: null,
    locationPreference: 'online',
    city: null,
    budgetMin: null,
    budgetMax: null,
    preferredDays: null,
    preferredTimeRanges: null,
    learningStyle: null,
    urgency: null,
    status: 'open',
  };
}

function makeCandidate(id: string): MatchCandidate {
  return {
    teacherProfileId: id,
    userId: `user-${id}`,
    hourlyRate: 100,
    locationType: 'online',
    city: null,
    ratingAvg: 4.0,
    ratingCount: 10,
    isVerified: true,
    isActive: true,
    lastActiveAt: new Date().toISOString(),
    userStatus: 'active',
    subjectMatches: [{ subjectId: SUBJECT_ID, level: 'high', yearsExperience: 5 }],
    availabilitySlots: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true }],
    scheduledLessonsThisWeek: 0,
  };
}

function makeInsertedRow(teacherId: string, rank: number) {
  return {
    id: `match-${rank}`,
    teacherId,
    rank,
    matchScore: 75.00,
    reason: '5 years experience, full availability match, rated 4.0 (10 reviews)',
  };
}

// ── Shorthand mock aliases ─────────────────────────────────────────────────────

const vi_verifyAccessToken       = vi.mocked(verifyAccessToken);
const vi_assertStudentAccess     = vi.mocked(assertStudentAccess);
const vi_createStudentIntake     = vi.mocked(createStudentIntake);
const vi_matchingGetIntake       = vi.mocked(matchingGetStudentIntakeById);
const vi_findCandidates          = vi.mocked(findInitialTeacherCandidates);
const vi_replaceMatchResults     = vi.mocked(replaceMatchResults);
const vi_withTransaction         = vi.mocked(withTransaction);

// ── Test body for create intake ────────────────────────────────────────────────

const VALID_BODY = {
  student_id: STUDENT_ID,
  subject_id: SUBJECT_ID,
  location_preference: 'online',
  level: 'high',
  budget_min: 80,
  budget_max: 200,
  preferred_days: [1, 3, 5],
  preferred_time_ranges: [{ start: '16:00', end: '20:00' }],
};

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('POST /api/student-intakes', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    vi_assertStudentAccess.mockResolvedValue(undefined);
    vi_replaceMatchResults.mockResolvedValue([]);
    vi_withTransaction.mockImplementation((fn) => fn({}));
  });

  // ── Auth & role guards ─────────────────────────────────────────────────────

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).post('/api/student-intakes').send(VALID_BODY);
    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty('success');
  });

  it('returns 403 when a teacher tries to create an intake', async () => {
    vi_verifyAccessToken.mockResolvedValue(TEACHER_AUTH);

    const res = await request(app)
      .post('/api/student-intakes')
      .set('Authorization', 'Bearer teacher-token')
      .send(VALID_BODY);

    expect(res.status).toBe(403);
    expect(res.body).not.toHaveProperty('success');
  });

  // ── Case 1: student creates own intake ─────────────────────────────────────

  it('allows a student to create an intake for their own profile', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);
    vi_createStudentIntake.mockResolvedValue(makeIntakeSummary());

    const res = await request(app)
      .post('/api/student-intakes')
      .set('Authorization', 'Bearer student-token')
      .send(VALID_BODY);

    expect(res.status).toBe(201);
    expect(vi_assertStudentAccess).toHaveBeenCalledWith(
      STUDENT_AUTH.user.id,
      'student',
      STUDENT_ID,
    );
    expect(res.body).not.toHaveProperty('success');
  });

  // ── Case 2: parent creates intake for linked child ─────────────────────────

  it('allows a parent to create an intake for their linked child', async () => {
    vi_verifyAccessToken.mockResolvedValue(PARENT_AUTH);
    vi_createStudentIntake.mockResolvedValue(makeIntakeSummary());

    const res = await request(app)
      .post('/api/student-intakes')
      .set('Authorization', 'Bearer parent-token')
      .send({ ...VALID_BODY, student_id: STUDENT_ID });

    expect(res.status).toBe(201);
    expect(vi_assertStudentAccess).toHaveBeenCalledWith(
      PARENT_ID,
      'parent',
      STUDENT_ID,
    );
  });

  // ── Case 3: parent cannot create intake for unlinked student ───────────────

  it('returns 403 when a parent tries to create intake for an unlinked student', async () => {
    vi_verifyAccessToken.mockResolvedValue(PARENT_AUTH);
    vi_assertStudentAccess.mockRejectedValue(new AppError('Forbidden', 403));

    const res = await request(app)
      .post('/api/student-intakes')
      .set('Authorization', 'Bearer parent-token')
      // Valid UUID but belongs to a student not linked to this parent
      .send({ ...VALID_BODY, student_id: 'e2ea0002-0000-4000-8000-000000000099' });

    expect(res.status).toBe(403);
    expect(vi_createStudentIntake).not.toHaveBeenCalled();
  });

  // ── Case 4: invalid preferred_days rejected ────────────────────────────────

  it('returns 422 when preferred_days contains a value out of range (7)', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);

    const res = await request(app)
      .post('/api/student-intakes')
      .set('Authorization', 'Bearer student-token')
      .send({ ...VALID_BODY, preferred_days: [1, 7] }); // 7 is invalid (max is 6)

    expect(res.status).toBe(422);
    expect(vi_createStudentIntake).not.toHaveBeenCalled();
  });

  it('returns 422 when preferred_days contains a non-integer value', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);

    const res = await request(app)
      .post('/api/student-intakes')
      .set('Authorization', 'Bearer student-token')
      .send({ ...VALID_BODY, preferred_days: [1, 2.5] });

    expect(res.status).toBe(422);
    expect(vi_createStudentIntake).not.toHaveBeenCalled();
  });

  // ── Case 5: invalid preferred_time_ranges rejected ────────────────────────

  it('returns 422 when a time range has start after end', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);

    const res = await request(app)
      .post('/api/student-intakes')
      .set('Authorization', 'Bearer student-token')
      .send({
        ...VALID_BODY,
        preferred_time_ranges: [{ start: '20:00', end: '16:00' }], // start > end
      });

    expect(res.status).toBe(422);
    expect(vi_createStudentIntake).not.toHaveBeenCalled();
  });

  it('returns 422 when a time range has an invalid format', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);

    const res = await request(app)
      .post('/api/student-intakes')
      .set('Authorization', 'Bearer student-token')
      .send({
        ...VALID_BODY,
        preferred_time_ranges: [{ start: '9:00', end: '17:00' }], // missing leading zero
      });

    expect(res.status).toBe(422);
    expect(vi_createStudentIntake).not.toHaveBeenCalled();
  });

  // ── Case 6: frontal without city rejected ─────────────────────────────────

  it('returns 422 when location_preference is frontal but city is missing', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);

    const res = await request(app)
      .post('/api/student-intakes')
      .set('Authorization', 'Bearer student-token')
      .send({ ...VALID_BODY, location_preference: 'frontal', city: undefined });

    expect(res.status).toBe(422);
    expect(vi_createStudentIntake).not.toHaveBeenCalled();
  });

  it('returns 422 when location_preference is frontal but city is empty string', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);

    const res = await request(app)
      .post('/api/student-intakes')
      .set('Authorization', 'Bearer student-token')
      .send({ ...VALID_BODY, location_preference: 'frontal', city: '' });

    expect(res.status).toBe(422);
    expect(vi_createStudentIntake).not.toHaveBeenCalled();
  });

  it('accepts frontal with a valid city', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);
    vi_createStudentIntake.mockResolvedValue(makeIntakeSummary());

    const res = await request(app)
      .post('/api/student-intakes')
      .set('Authorization', 'Bearer student-token')
      .send({ ...VALID_BODY, location_preference: 'frontal', city: 'תל אביב' });

    expect(res.status).toBe(201);
  });

  // ── Case 7: valid intake starts with status open ───────────────────────────

  it('returns status open for a newly created intake', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);
    vi_createStudentIntake.mockResolvedValue(makeIntakeSummary({ status: 'open' }));

    const res = await request(app)
      .post('/api/student-intakes')
      .set('Authorization', 'Bearer student-token')
      .send(VALID_BODY);

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('open');
  });

  // ── Required fields validation ─────────────────────────────────────────────

  it('returns 422 when student_id is missing', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);

    const { student_id: _, ...bodyWithoutStudentId } = VALID_BODY;

    const res = await request(app)
      .post('/api/student-intakes')
      .set('Authorization', 'Bearer student-token')
      .send(bodyWithoutStudentId);

    expect(res.status).toBe(422);
  });

  it('returns 422 when subject_id is missing', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);

    const { subject_id: _, ...bodyWithoutSubjectId } = VALID_BODY;

    const res = await request(app)
      .post('/api/student-intakes')
      .set('Authorization', 'Bearer student-token')
      .send(bodyWithoutSubjectId);

    expect(res.status).toBe(422);
  });

  it('returns 422 when location_preference is invalid', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);

    const res = await request(app)
      .post('/api/student-intakes')
      .set('Authorization', 'Bearer student-token')
      .send({ ...VALID_BODY, location_preference: 'hybrid' }); // not in enum

    expect(res.status).toBe(422);
  });

  // ── Budget cross-field validation ──────────────────────────────────────────

  it('returns 422 when budget_min exceeds budget_max', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);

    const res = await request(app)
      .post('/api/student-intakes')
      .set('Authorization', 'Bearer student-token')
      .send({ ...VALID_BODY, budget_min: 300, budget_max: 100 });

    expect(res.status).toBe(422);
    expect(vi_createStudentIntake).not.toHaveBeenCalled();
  });

  // ── Response shape ─────────────────────────────────────────────────────────

  it('response body has data wrapper and no success property', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);
    vi_createStudentIntake.mockResolvedValue(makeIntakeSummary());

    const res = await request(app)
      .post('/api/student-intakes')
      .set('Authorization', 'Bearer student-token')
      .send(VALID_BODY);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('data');
    expect(res.body).not.toHaveProperty('success');
    expect(res.body.data).toHaveProperty('intake_id');
    expect(res.body.data).toHaveProperty('student_id');
    expect(res.body.data).toHaveProperty('subject_id');
    expect(res.body.data).toHaveProperty('status');
  });

  // ── Duplicate days normalization ───────────────────────────────────────────

  it('deduplicates preferred_days before passing to repository', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);
    vi_createStudentIntake.mockResolvedValue(makeIntakeSummary());

    await request(app)
      .post('/api/student-intakes')
      .set('Authorization', 'Bearer student-token')
      .send({ ...VALID_BODY, preferred_days: [3, 1, 3, 1, 5] }); // duplicates

    expect(vi_createStudentIntake).toHaveBeenCalledWith(
      expect.objectContaining({ preferredDays: [1, 3, 5] }),
    );
  });
});

// ── E2E: create intake → run matching ─────────────────────────────────────────

describe('E2E: create intake then run matching', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    vi_assertStudentAccess.mockResolvedValue(undefined);
    vi_replaceMatchResults.mockResolvedValue([]);
    vi_withTransaction.mockImplementation((fn) => fn({}));
  });

  // ── Case 8: run matching after intake creation returns matches ─────────────

  it('creates intake then runs matching and receives up to 3 matches', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);

    // Step 1: create intake
    vi_createStudentIntake.mockResolvedValue(makeIntakeSummary({ id: INTAKE_ID }));

    const createRes = await request(app)
      .post('/api/student-intakes')
      .set('Authorization', 'Bearer student-token')
      .send(VALID_BODY);

    expect(createRes.status).toBe(201);
    expect(createRes.body).not.toHaveProperty('success');
    const intakeId = createRes.body.data.intake_id as string;

    // Step 2: run matching using the returned intake id
    vi_matchingGetIntake.mockResolvedValue(makeIntakeWithContext(intakeId));
    vi_findCandidates.mockResolvedValue([
      makeCandidate('e2ea0003-0000-4000-8000-000000000010'),
      makeCandidate('e2ea0003-0000-4000-8000-000000000011'),
      makeCandidate('e2ea0003-0000-4000-8000-000000000012'),
    ]);
    vi_replaceMatchResults.mockResolvedValue([
      makeInsertedRow('e2ea0003-0000-4000-8000-000000000010', 1),
      makeInsertedRow('e2ea0003-0000-4000-8000-000000000011', 2),
      makeInsertedRow('e2ea0003-0000-4000-8000-000000000012', 3),
    ]);

    const matchRes = await request(app)
      .post(`/api/matching/${intakeId}/run`)
      .set('Authorization', 'Bearer student-token');

    expect(matchRes.status).toBe(200);
    expect(matchRes.body).not.toHaveProperty('success');
    expect(matchRes.body.data.intakeId).toBe(intakeId);
    expect(matchRes.body.data.matches).toHaveLength(3);
    expect(matchRes.body.data.matchingVersion).toBe('v1');

    // Each match should have the required fields
    const [firstMatch] = matchRes.body.data.matches;
    expect(firstMatch).toHaveProperty('id');
    expect(firstMatch).toHaveProperty('teacherId');
    expect(firstMatch).toHaveProperty('rank', 1);
    expect(firstMatch).toHaveProperty('matchScore');
    expect(firstMatch).toHaveProperty('reason');
    expect(firstMatch).toHaveProperty('fallbackPhase');
  });

  // ── Case 9: no { success: true } anywhere ─────────────────────────────────

  it('create intake response never contains success property', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);
    vi_createStudentIntake.mockResolvedValue(makeIntakeSummary());

    const res = await request(app)
      .post('/api/student-intakes')
      .set('Authorization', 'Bearer student-token')
      .send(VALID_BODY);

    expect(res.body).not.toHaveProperty('success');
    expect(res.body.data).not.toHaveProperty('success');
  });

  it('matching response never contains success property', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);
    vi_matchingGetIntake.mockResolvedValue(makeIntakeWithContext(INTAKE_ID));
    vi_findCandidates.mockResolvedValue([]);

    const res = await request(app)
      .post(`/api/matching/${INTAKE_ID}/run`)
      .set('Authorization', 'Bearer student-token');

    expect(res.body).not.toHaveProperty('success');
  });
});
