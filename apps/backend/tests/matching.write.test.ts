import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Module mocks (hoisted before imports) ─────────────────────────────────────

vi.mock('../src/auth/authService.js', () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock('../src/auth/ownership.js', () => ({
  assertStudentAccess: vi.fn(),
}));

vi.mock('../src/matching/matching.repository.js', () => ({
  getStudentIntakeById: vi.fn(),
  findInitialTeacherCandidates: vi.fn(),
  lockIntakeForUpdate: vi.fn(),
  deleteMatchResults: vi.fn(),
  insertMatchResults: vi.fn(),
  updateIntakeStatus: vi.fn(),
}));

vi.mock('../src/db/transaction.js', () => ({
  withTransaction: vi.fn((fn: (sql: unknown) => Promise<unknown>) => fn({})),
}));

import { createApp } from '../src/app.js';
import { verifyAccessToken } from '../src/auth/authService.js';
import { assertStudentAccess } from '../src/auth/ownership.js';
import { AppError } from '../src/errors/AppError.js';
import {
  deleteMatchResults,
  findInitialTeacherCandidates,
  getStudentIntakeById,
  insertMatchResults,
  lockIntakeForUpdate,
  updateIntakeStatus,
} from '../src/matching/matching.repository.js';
import { withTransaction } from '../src/db/transaction.js';
import type { IntakeWithContext, MatchCandidate } from '../src/matching/matching.types.js';

// ── Auth fixtures ──────────────────────────────────────────────────────────────

const STUDENT_AUTH = {
  access_token: 'student-token',
  auth_user_id: 'auth-uuid-student',
  user: {
    id: 'user-uuid-student',
    supabase_auth_user_id: 'auth-uuid-student',
    email: 'student@example.com',
    role: 'student' as const,
    full_name: 'דני דן',
    status: 'active' as const,
  },
};

const PARENT_AUTH = {
  access_token: 'parent-token',
  auth_user_id: 'auth-uuid-parent',
  user: {
    id: 'user-uuid-parent',
    supabase_auth_user_id: 'auth-uuid-parent',
    email: 'parent@example.com',
    role: 'parent' as const,
    full_name: 'שרה שר',
    status: 'active' as const,
  },
};

const TEACHER_AUTH = {
  access_token: 'teacher-token',
  auth_user_id: 'auth-uuid-teacher',
  user: {
    id: 'user-uuid-teacher',
    supabase_auth_user_id: 'auth-uuid-teacher',
    email: 'teacher@example.com',
    role: 'teacher' as const,
    full_name: 'יוסי יוס',
    status: 'active' as const,
  },
};

// ── Data fixtures ──────────────────────────────────────────────────────────────

const INTAKE_ID = 'intake-uuid-1';
const SUBJECT_ID = 'subject-uuid-1';
const STUDENT_ID = 'student-uuid-1';

function makeIntake(overrides: Partial<IntakeWithContext> = {}): IntakeWithContext {
  return {
    id: INTAKE_ID,
    studentId: STUDENT_ID,
    createdByUserId: PARENT_AUTH.user.id,
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
    ...overrides,
  };
}

function makeCandidate(id: string, overrides: Partial<MatchCandidate> = {}): MatchCandidate {
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
    ...overrides,
  };
}

function makeInsertedRow(teacherId: string, rank: number) {
  return {
    id: `match-result-${rank}`,
    teacherId,
    rank,
    matchScore: 75.00,
    reason: '5 years experience, full availability match, rated 4.0 (10 reviews)',
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const vi_verifyAccessToken = vi.mocked(verifyAccessToken);
const vi_assertStudentAccess = vi.mocked(assertStudentAccess);
const vi_getStudentIntakeById = vi.mocked(getStudentIntakeById);
const vi_findInitialTeacherCandidates = vi.mocked(findInitialTeacherCandidates);
const vi_lockIntakeForUpdate = vi.mocked(lockIntakeForUpdate);
const vi_deleteMatchResults = vi.mocked(deleteMatchResults);
const vi_insertMatchResults = vi.mocked(insertMatchResults);
const vi_updateIntakeStatus = vi.mocked(updateIntakeStatus);
const vi_withTransaction = vi.mocked(withTransaction);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/matching/:intakeId/run', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    vi_assertStudentAccess.mockResolvedValue(undefined);
    vi_deleteMatchResults.mockResolvedValue(undefined);
    vi_updateIntakeStatus.mockResolvedValue(undefined);
    // withTransaction executes callback inline with a mock sql placeholder
    vi_withTransaction.mockImplementation((fn) => fn({}));
  });

  // ── Auth & role guards ─────────────────────────────────────────────────────

  it('returns 401 when no auth token is provided', async () => {
    const res = await request(app).post(`/api/matching/${INTAKE_ID}/run`);
    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty('success');
  });

  it('returns 403 when a teacher tries to run matching', async () => {
    vi_verifyAccessToken.mockResolvedValue(TEACHER_AUTH);

    const res = await request(app)
      .post(`/api/matching/${INTAKE_ID}/run`)
      .set('Authorization', 'Bearer teacher-token');

    expect(res.status).toBe(403);
    expect(res.body).not.toHaveProperty('success');
  });

  it('allows a student to run matching', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);
    vi_getStudentIntakeById.mockResolvedValue(makeIntake());
    vi_findInitialTeacherCandidates.mockResolvedValue([]);
    vi_lockIntakeForUpdate.mockResolvedValue({ id: INTAKE_ID, status: 'open' });
    vi_insertMatchResults.mockResolvedValue([]);

    const res = await request(app)
      .post(`/api/matching/${INTAKE_ID}/run`)
      .set('Authorization', 'Bearer student-token');

    expect(res.status).toBe(200);
  });

  it('allows a parent to run matching', async () => {
    vi_verifyAccessToken.mockResolvedValue(PARENT_AUTH);
    vi_getStudentIntakeById.mockResolvedValue(makeIntake());
    vi_findInitialTeacherCandidates.mockResolvedValue([]);
    vi_lockIntakeForUpdate.mockResolvedValue({ id: INTAKE_ID, status: 'open' });
    vi_insertMatchResults.mockResolvedValue([]);

    const res = await request(app)
      .post(`/api/matching/${INTAKE_ID}/run`)
      .set('Authorization', 'Bearer parent-token');

    expect(res.status).toBe(200);
  });

  // ── Happy path: 3 matches ──────────────────────────────────────────────────

  it('returns 3 matches and sets intake status to matched', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);
    vi_getStudentIntakeById.mockResolvedValue(makeIntake());

    const candidates = [
      makeCandidate('teacher-1'),
      makeCandidate('teacher-2'),
      makeCandidate('teacher-3'),
    ];
    vi_findInitialTeacherCandidates.mockResolvedValue(candidates);
    vi_lockIntakeForUpdate.mockResolvedValue({ id: INTAKE_ID, status: 'open' });
    vi_insertMatchResults.mockResolvedValue([
      makeInsertedRow('teacher-1', 1),
      makeInsertedRow('teacher-2', 2),
      makeInsertedRow('teacher-3', 3),
    ]);

    const res = await request(app)
      .post(`/api/matching/${INTAKE_ID}/run`)
      .set('Authorization', 'Bearer student-token');

    expect(res.status).toBe(200);
    expect(res.body.data.intakeId).toBe(INTAKE_ID);
    expect(res.body.data.matches).toHaveLength(3);
    expect(res.body.data.matchingVersion).toBe('v1');
    expect(res.body.data.matches[0]).toMatchObject({
      id: 'match-result-1',
      rank: 1,
      teacherId: 'teacher-1',
    });

    // status updated to 'matched' since we have results
    expect(vi_updateIntakeStatus).toHaveBeenCalledWith({}, INTAKE_ID, 'matched');
    expect(res.body).not.toHaveProperty('success');
  });

  it('includes fallbackPhase in each match entry', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);
    vi_getStudentIntakeById.mockResolvedValue(makeIntake());
    vi_findInitialTeacherCandidates.mockResolvedValue([
      makeCandidate('teacher-1'),
      makeCandidate('teacher-2'),
      makeCandidate('teacher-3'),
    ]);
    vi_lockIntakeForUpdate.mockResolvedValue({ id: INTAKE_ID, status: 'open' });
    vi_insertMatchResults.mockResolvedValue([
      makeInsertedRow('teacher-1', 1),
      makeInsertedRow('teacher-2', 2),
      makeInsertedRow('teacher-3', 3),
    ]);

    const res = await request(app)
      .post(`/api/matching/${INTAKE_ID}/run`)
      .set('Authorization', 'Bearer student-token');

    expect(res.status).toBe(200);
    for (const match of res.body.data.matches) {
      expect(['strict', 'budget_expansion', 'online_fallback', 'partial_results']).toContain(
        match.fallbackPhase,
      );
    }
  });

  // ── Partial results ────────────────────────────────────────────────────────

  it('returns 1 match and still sets status to matched when only 1 candidate passes', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);
    vi_getStudentIntakeById.mockResolvedValue(makeIntake());
    vi_findInitialTeacherCandidates.mockResolvedValue([makeCandidate('teacher-1')]);
    vi_lockIntakeForUpdate.mockResolvedValue({ id: INTAKE_ID, status: 'open' });
    vi_insertMatchResults.mockResolvedValue([makeInsertedRow('teacher-1', 1)]);

    const res = await request(app)
      .post(`/api/matching/${INTAKE_ID}/run`)
      .set('Authorization', 'Bearer student-token');

    expect(res.status).toBe(200);
    expect(res.body.data.matches).toHaveLength(1);
    expect(vi_updateIntakeStatus).toHaveBeenCalledWith({}, INTAKE_ID, 'matched');
  });

  // ── No matches ─────────────────────────────────────────────────────────────

  it('returns empty matches and leaves intake status open when no candidates pass filters', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);
    vi_getStudentIntakeById.mockResolvedValue(makeIntake());
    vi_findInitialTeacherCandidates.mockResolvedValue([]);
    vi_lockIntakeForUpdate.mockResolvedValue({ id: INTAKE_ID, status: 'open' });

    const res = await request(app)
      .post(`/api/matching/${INTAKE_ID}/run`)
      .set('Authorization', 'Bearer student-token');

    expect(res.status).toBe(200);
    expect(res.body.data.matches).toHaveLength(0);
    // no rows → intake stays 'open'
    expect(vi_updateIntakeStatus).toHaveBeenCalledWith({}, INTAKE_ID, 'open');
    // insertMatchResults must NOT be called when there are no rows
    expect(vi_insertMatchResults).not.toHaveBeenCalled();
  });

  // ── Not found ──────────────────────────────────────────────────────────────

  it('returns 404 when intake does not exist (pre-transaction)', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);
    vi_getStudentIntakeById.mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/matching/${INTAKE_ID}/run`)
      .set('Authorization', 'Bearer student-token');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'Student intake not found' });
  });

  it('returns 404 when intake disappears between pre-transaction check and lock', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);
    vi_getStudentIntakeById.mockResolvedValue(makeIntake());
    vi_findInitialTeacherCandidates.mockResolvedValue([]);
    vi_lockIntakeForUpdate.mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/matching/${INTAKE_ID}/run`)
      .set('Authorization', 'Bearer student-token');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'Student intake not found' });
  });

  // ── Closed intake ──────────────────────────────────────────────────────────

  it('returns 422 when the locked intake is closed', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);
    vi_getStudentIntakeById.mockResolvedValue(makeIntake());
    vi_findInitialTeacherCandidates.mockResolvedValue([]);
    vi_lockIntakeForUpdate.mockResolvedValue({ id: INTAKE_ID, status: 'closed' });

    const res = await request(app)
      .post(`/api/matching/${INTAKE_ID}/run`)
      .set('Authorization', 'Bearer student-token');

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ error: 'Cannot run matching on a closed intake' });
  });

  // ── Re-run on matched intake ───────────────────────────────────────────────

  it('allows re-running matching on a matched intake (idempotent)', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);
    // pre-transaction intake has status 'open' (from first run); lock sees 'matched' (updated by prior run)
    vi_getStudentIntakeById.mockResolvedValue(makeIntake({ status: 'matched' }));
    vi_findInitialTeacherCandidates.mockResolvedValue([makeCandidate('teacher-1')]);
    vi_lockIntakeForUpdate.mockResolvedValue({ id: INTAKE_ID, status: 'matched' });
    vi_insertMatchResults.mockResolvedValue([makeInsertedRow('teacher-1', 1)]);

    const res = await request(app)
      .post(`/api/matching/${INTAKE_ID}/run`)
      .set('Authorization', 'Bearer student-token');

    expect(res.status).toBe(200);
    expect(res.body.data.matches).toHaveLength(1);
  });

  // ── Delete-before-insert (idempotency) ────────────────────────────────────

  it('always calls deleteMatchResults before insertMatchResults', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);
    vi_getStudentIntakeById.mockResolvedValue(makeIntake());
    vi_findInitialTeacherCandidates.mockResolvedValue([makeCandidate('teacher-1')]);
    vi_lockIntakeForUpdate.mockResolvedValue({ id: INTAKE_ID, status: 'open' });
    vi_insertMatchResults.mockResolvedValue([makeInsertedRow('teacher-1', 1)]);

    const callOrder: string[] = [];
    vi_deleteMatchResults.mockImplementation(async () => { callOrder.push('delete'); });
    vi_insertMatchResults.mockImplementation(async () => {
      callOrder.push('insert');
      return [makeInsertedRow('teacher-1', 1)];
    });

    await request(app)
      .post(`/api/matching/${INTAKE_ID}/run`)
      .set('Authorization', 'Bearer student-token');

    expect(callOrder).toEqual(['delete', 'insert']);
  });

  // ── Ownership enforcement ──────────────────────────────────────────────────

  it('returns 403 when assertStudentAccess throws Forbidden', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);
    vi_getStudentIntakeById.mockResolvedValue(makeIntake({ studentId: 'other-student-uuid' }));
    vi_assertStudentAccess.mockRejectedValue(new AppError('Forbidden', 403));

    const res = await request(app)
      .post(`/api/matching/${INTAKE_ID}/run`)
      .set('Authorization', 'Bearer student-token');

    expect(res.status).toBe(403);
  });

  // ── Transaction rollback ───────────────────────────────────────────────────

  it('does not call updateIntakeStatus when insertMatchResults throws', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);
    vi_getStudentIntakeById.mockResolvedValue(makeIntake());
    vi_findInitialTeacherCandidates.mockResolvedValue([makeCandidate('teacher-1')]);
    vi_lockIntakeForUpdate.mockResolvedValue({ id: INTAKE_ID, status: 'open' });
    vi_insertMatchResults.mockRejectedValue(new Error('DB insert failed'));

    const res = await request(app)
      .post(`/api/matching/${INTAKE_ID}/run`)
      .set('Authorization', 'Bearer student-token');

    expect(res.status).toBe(500);
    expect(vi_updateIntakeStatus).not.toHaveBeenCalled();
  });

  // ── Response shape ─────────────────────────────────────────────────────────

  it('response body has data wrapper and no success property', async () => {
    vi_verifyAccessToken.mockResolvedValue(STUDENT_AUTH);
    vi_getStudentIntakeById.mockResolvedValue(makeIntake());
    vi_findInitialTeacherCandidates.mockResolvedValue([]);
    vi_lockIntakeForUpdate.mockResolvedValue({ id: INTAKE_ID, status: 'open' });

    const res = await request(app)
      .post(`/api/matching/${INTAKE_ID}/run`)
      .set('Authorization', 'Bearer student-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).not.toHaveProperty('success');
    expect(res.body.data).toHaveProperty('intakeId');
    expect(res.body.data).toHaveProperty('matches');
    expect(res.body.data).toHaveProperty('fallbackPhaseUsed');
    expect(res.body.data).toHaveProperty('matchingVersion', 'v1');
  });
});
