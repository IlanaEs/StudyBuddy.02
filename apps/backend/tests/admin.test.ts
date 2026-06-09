import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Module mocks (hoisted before imports) ─────────────────────────────────────

vi.mock('../src/auth/authService.js', () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock('../src/admin/admin.repository.js', () => ({
  insertAdminAction: vi.fn(),
  listAdminActions: vi.fn(),
  getOverviewCounts: vi.fn(),
  listTeachersCrmPage: vi.fn(),
  getTeacherAggregates: vi.fn(),
  listStudentsCrmPage: vi.fn(),
  getStudentAggregates: vi.fn(),
  listParentsCrmPage: vi.fn(),
  getParentAggregates: vi.fn(),
  listPendingApprovals: vi.fn(),
  getTeacherApprovalState: vi.fn(),
  setTeacherApproval: vi.fn(),
  getDemandBySubject: vi.fn(),
  getSupplyBySubject: vi.fn(),
  getCompletedLessonsBySubject: vi.fn(),
  getBookingsBySubject: vi.fn(),
  getOffCatalogFailedSearches: vi.fn(),
  getUnmatchedOpenCount: vi.fn(),
}));

vi.mock('../src/parentDashboard/parentDashboard.repository.js', () => ({
  batchGetSubjectNamesByIds: vi.fn(),
}));

import { adminRouter } from '../src/admin/admin.routes.js';
import {
  approveTeacher,
  getAuditLog,
  getMatchingInsights,
  getOverview,
  getParentsCrm,
  getStudentsCrm,
  getTeacherApprovalQueue,
  getTeachersCrm,
  recordAdminAction,
  rejectTeacher,
} from '../src/admin/admin.service.js';
import {
  getBookingsBySubject,
  getCompletedLessonsBySubject,
  getDemandBySubject,
  getOffCatalogFailedSearches,
  getOverviewCounts,
  getParentAggregates,
  getStudentAggregates,
  getSupplyBySubject,
  getTeacherAggregates,
  getTeacherApprovalState,
  getUnmatchedOpenCount,
  insertAdminAction,
  listAdminActions,
  listParentsCrmPage,
  listPendingApprovals,
  listStudentsCrmPage,
  listTeachersCrmPage,
  setTeacherApproval,
} from '../src/admin/admin.repository.js';
import { batchGetSubjectNamesByIds } from '../src/parentDashboard/parentDashboard.repository.js';
import { verifyAccessToken } from '../src/auth/authService.js';
import { errorHandler } from '../src/errors/errorHandler.js';
import { AppError } from '../src/errors/AppError.js';
import type { LocalUser, UserRole } from '../src/auth/authTypes.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeUser(role: UserRole): LocalUser {
  return {
    id: `user-${role}`,
    supabase_auth_user_id: `auth-${role}`,
    email: `${role}@example.com`,
    role,
    full_name: 'Test User',
    status: 'active',
  };
}

function makeAuthContext(role: UserRole) {
  return { access_token: `${role}-token`, auth_user_id: `auth-${role}`, user: makeUser(role) };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── recordAdminAction (the reusable audit-write helper) ────────────────────────

describe('recordAdminAction', () => {
  it('inserts with the actor id and forwards the action fields', async () => {
    const row = {
      id: 'a-1',
      adminUserId: 'user-admin',
      actionType: 'user.block',
      targetEntityType: 'user',
      targetEntityId: 'target-1',
      notes: 'spam',
      createdAt: '2026-06-09T00:00:00.000Z',
      updatedAt: '2026-06-09T00:00:00.000Z',
    };
    vi.mocked(insertAdminAction).mockResolvedValue(row);

    const result = await recordAdminAction(makeUser('admin'), {
      action_type: 'user.block',
      target_entity_type: 'user',
      target_entity_id: 'target-1',
      notes: 'spam',
    });

    expect(insertAdminAction).toHaveBeenCalledWith('user-admin', {
      action_type: 'user.block',
      target_entity_type: 'user',
      target_entity_id: 'target-1',
      notes: 'spam',
    });
    expect(result).toBe(row);
  });

  it('refuses a non-admin actor (403) and never writes', async () => {
    await expect(
      recordAdminAction(makeUser('teacher'), {
        action_type: 'user.block',
        target_entity_type: 'user',
        target_entity_id: 'target-1',
      }),
    ).rejects.toMatchObject({ statusCode: 403 } satisfies Partial<AppError>);

    expect(insertAdminAction).not.toHaveBeenCalled();
  });
});

// ── getAuditLog (pagination + filters) ─────────────────────────────────────────

describe('getAuditLog', () => {
  it('computes the offset from page/per_page and reports total_pages', async () => {
    vi.mocked(listAdminActions).mockResolvedValue({ items: [], total: 23 });

    const result = await getAuditLog({ page: 2, per_page: 10 });

    expect(listAdminActions).toHaveBeenCalledWith({}, { limit: 10, offset: 10 });
    expect(result).toMatchObject({ page: 2, per_page: 10, total: 23, total_pages: 3 });
  });

  it('forwards every filter to the repository', async () => {
    vi.mocked(listAdminActions).mockResolvedValue({ items: [], total: 0 });

    await getAuditLog({
      page: 1,
      per_page: 25,
      actorId: 'actor-1',
      actionType: 'user.block',
      targetEntityType: 'user',
      targetEntityId: 'target-1',
    });

    expect(listAdminActions).toHaveBeenCalledWith(
      {
        actorId: 'actor-1',
        actionType: 'user.block',
        targetEntityType: 'user',
        targetEntityId: 'target-1',
      },
      { limit: 25, offset: 0 },
    );
  });

  it('returns total_pages 0 on an empty log', async () => {
    vi.mocked(listAdminActions).mockResolvedValue({ items: [], total: 0 });

    const result = await getAuditLog({ page: 1, per_page: 25 });

    expect(result.items).toEqual([]);
    expect(result.total_pages).toBe(0);
  });
});

// ── GET /api/admin/audit-log (server-side authorization) ───────────────────────

describe('GET /api/admin/audit-log', () => {
  it('returns 401 without an Authorization header', async () => {
    const response = await request(buildApp()).get('/api/admin/audit-log');

    expect(response.status).toBe(401);
    expect(response.body).not.toHaveProperty('data');
  });

  it('returns 403 for a non-admin role (not just UI-hidden)', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(makeAuthContext('teacher'));

    const response = await request(buildApp())
      .get('/api/admin/audit-log')
      .set('Authorization', 'Bearer teacher-token');

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: expect.any(String) });
    expect(response.body).not.toHaveProperty('data');
  });

  it('returns 200 with the paginated envelope for an admin', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(makeAuthContext('admin'));
    vi.mocked(listAdminActions).mockResolvedValue({ items: [], total: 0 });

    const response = await request(buildApp())
      .get('/api/admin/audit-log')
      .set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: { items: [], page: 1, per_page: 25, total: 0, total_pages: 0 },
    });
  });

  it('returns 422 for an out-of-range per_page', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(makeAuthContext('admin'));

    const response = await request(buildApp())
      .get('/api/admin/audit-log?per_page=999')
      .set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(422);
    expect(response.body).not.toHaveProperty('data');
  });
});

// ── getOverview (T1: counts → rates) ───────────────────────────────────────────

const ZERO_COUNTS = {
  totalUsers: 0,
  totalStudents: 0,
  totalTeachers: 0,
  activeTeachers: 0,
  pendingVerifications: 0,
  pendingBookingRequests: 0,
  bookingRequestsTotal: 0,
  bookingRequestsApproved: 0,
  studentIntakesTotal: 0,
  intakesMatched: 0,
  scheduledLessons: 0,
  completedLessons: 0,
  totalLessons: 0,
};

describe('getOverview', () => {
  it('maps counts and computes each rate from the right numerator/denominator', async () => {
    vi.mocked(getOverviewCounts).mockResolvedValue({
      ...ZERO_COUNTS,
      totalUsers: 100,
      totalStudents: 60,
      totalTeachers: 20,
      activeTeachers: 8,
      pendingVerifications: 3,
      pendingBookingRequests: 5,
      bookingRequestsTotal: 40,
      bookingRequestsApproved: 30,
      studentIntakesTotal: 50,
      intakesMatched: 35,
      scheduledLessons: 12,
      completedLessons: 18,
      totalLessons: 25,
    });

    const result = await getOverview();

    expect(result.counts).toEqual({
      total_users: 100,
      total_students: 60,
      active_teachers: 8,
      pending_verifications: 3,
      pending_booking_requests: 5,
      scheduled_lessons: 12,
      completed_lessons: 18,
      average_lesson_rating: null,
    });
    expect(result.rates.conversion).toEqual({ value: 0.8, numerator: 40, denominator: 50 });
    expect(result.rates.match_success).toEqual({ value: 0.7, numerator: 35, denominator: 50 });
    expect(result.rates.approval).toEqual({ value: 0.75, numerator: 30, denominator: 40 });
    // completion uses total_lessons as the denominator (not scheduled count).
    expect(result.rates.completion).toEqual({ value: 0.72, numerator: 18, denominator: 25 });
    expect(result.rates.teacher_activation).toEqual({ value: 0.4, numerator: 8, denominator: 20 });
  });

  it('returns null rate values when a denominator is zero (no ÷0)', async () => {
    vi.mocked(getOverviewCounts).mockResolvedValue({ ...ZERO_COUNTS });

    const result = await getOverview();

    for (const r of Object.values(result.rates)) {
      expect(r.value).toBeNull();
    }
    expect(result.counts.average_lesson_rating).toBeNull();
  });
});

// ── GET /api/admin/overview (server-side authorization) ────────────────────────

describe('GET /api/admin/overview', () => {
  it('returns 401 without an Authorization header', async () => {
    const response = await request(buildApp()).get('/api/admin/overview');
    expect(response.status).toBe(401);
    expect(response.body).not.toHaveProperty('data');
  });

  it('returns 403 for a non-admin role', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(makeAuthContext('student'));

    const response = await request(buildApp())
      .get('/api/admin/overview')
      .set('Authorization', 'Bearer student-token');

    expect(response.status).toBe(403);
    expect(response.body).not.toHaveProperty('data');
  });

  it('returns 200 with counts + rates for an admin', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(makeAuthContext('admin'));
    vi.mocked(getOverviewCounts).mockResolvedValue({ ...ZERO_COUNTS });

    const response = await request(buildApp())
      .get('/api/admin/overview')
      .set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('counts');
    expect(response.body.data).toHaveProperty('rates');
    expect(response.body.data.counts.average_lesson_rating).toBeNull();
    expect(response.body.data.rates.conversion).toEqual({ value: null, numerator: 0, denominator: 0 });
  });
});

// ── Users CRM: Teachers ────────────────────────────────────────────────────────

describe('getTeachersCrm', () => {
  it('assembles a teacher row with approval rate + N/A stubs', async () => {
    vi.mocked(listTeachersCrmPage).mockResolvedValue({
      rows: [
        {
          profileId: 'tp-1',
          userId: 'u-1',
          fullName: 'מר כהן',
          email: 'cohen@example.com',
          status: 'active',
          joinDate: '2026-01-01T00:00:00.000Z',
          isVerified: true,
          lastActiveAt: '2026-02-01T00:00:00.000Z',
        },
      ],
      total: 1,
    });
    vi.mocked(getTeacherAggregates).mockResolvedValue(
      new Map([
        ['tp-1', { subjects: ['מתמטיקה'], levels: ['א'], completedLessons: 4, activeStudents: 2, approved: 3, totalBookings: 4 }],
      ]),
    );

    const result = await getTeachersCrm({ page: 1, per_page: 25 });

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: 'tp-1',
      full_name: 'מר כהן',
      subjects: ['מתמטיקה'],
      completed_lessons: 4,
      active_students: 2,
      approval_rate: { value: 0.75, numerator: 3, denominator: 4 },
      subscription_plan: null,
      average_rating: null,
    });
  });

  it('approval rate is null when the teacher has no booking requests', async () => {
    vi.mocked(listTeachersCrmPage).mockResolvedValue({
      rows: [
        {
          profileId: 'tp-2',
          userId: 'u-2',
          fullName: 'מורה חדשה',
          email: 'new@example.com',
          status: 'active',
          joinDate: '2026-03-01T00:00:00.000Z',
          isVerified: false,
          lastActiveAt: null,
        },
      ],
      total: 1,
    });
    vi.mocked(getTeacherAggregates).mockResolvedValue(new Map());

    const result = await getTeachersCrm({ page: 1, per_page: 25 });

    expect(result.items[0].approval_rate).toEqual({ value: null, numerator: 0, denominator: 0 });
    expect(result.items[0].subjects).toEqual([]);
    expect(result.items[0].last_activity_at).toBeNull();
  });
});

// ── Users CRM: Students ────────────────────────────────────────────────────────

describe('getStudentsCrm', () => {
  it('passes through account_type and resolved subjects + lesson_count', async () => {
    vi.mocked(listStudentsCrmPage).mockResolvedValue({
      rows: [
        { id: 's-1', fullName: 'דנה', accountType: 'parent_managed', gradeLevel: 'י׳', ageGroup: '15-16' },
      ],
      total: 1,
    });
    vi.mocked(getStudentAggregates).mockResolvedValue(
      new Map([['s-1', { subjects: ['פיזיקה'], lessonCount: 3 }]]),
    );

    const result = await getStudentsCrm({ page: 1, per_page: 25 });

    expect(result.items[0]).toEqual({
      id: 's-1',
      full_name: 'דנה',
      account_type: 'parent_managed',
      grade_level: 'י׳',
      age_group: '15-16',
      subjects: ['פיזיקה'],
      lesson_count: 3,
    });
  });
});

// ── Users CRM: Parents ─────────────────────────────────────────────────────────

describe('getParentsCrm', () => {
  it('aggregates children + active lessons; last_activity is a null stub', async () => {
    vi.mocked(listParentsCrmPage).mockResolvedValue({
      rows: [{ id: 'p-1', fullName: 'הורה', email: 'parent@example.com' }],
      total: 1,
    });
    vi.mocked(getParentAggregates).mockResolvedValue(
      new Map([['p-1', { childrenCount: 2, activeLessons: 1 }]]),
    );

    const result = await getParentsCrm({ page: 1, per_page: 25 });

    expect(result.items[0]).toEqual({
      id: 'p-1',
      full_name: 'הורה',
      email: 'parent@example.com',
      children_count: 2,
      active_lessons: 1,
      last_activity_at: null,
    });
  });
});

// ── Users CRM route authorization ──────────────────────────────────────────────

describe('Users CRM route authorization', () => {
  const paths = ['/api/admin/teachers', '/api/admin/students', '/api/admin/parents'];

  it('rejects all CRM endpoints with 401 when unauthenticated', async () => {
    for (const path of paths) {
      const response = await request(buildApp()).get(path);
      expect(response.status).toBe(401);
    }
  });

  it('rejects all CRM endpoints with 403 for a non-admin role', async () => {
    for (const path of paths) {
      vi.mocked(verifyAccessToken).mockResolvedValueOnce(makeAuthContext('parent'));
      const response = await request(buildApp()).get(path).set('Authorization', 'Bearer parent-token');
      expect(response.status).toBe(403);
      expect(response.body).not.toHaveProperty('data');
    }
  });

  it('returns 200 list envelope for an admin (teachers)', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(makeAuthContext('admin'));
    vi.mocked(listTeachersCrmPage).mockResolvedValue({ rows: [], total: 0 });
    vi.mocked(getTeacherAggregates).mockResolvedValue(new Map());

    const response = await request(buildApp())
      .get('/api/admin/teachers')
      .set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ items: [], page: 1, per_page: 25, total: 0, total_pages: 0 });
  });

  it('returns 422 for an invalid account_type (students)', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(makeAuthContext('admin'));

    const response = await request(buildApp())
      .get('/api/admin/students?account_type=bogus')
      .set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(422);
    expect(response.body).not.toHaveProperty('data');
  });
});

// ── Teacher approval queue ──────────────────────────────────────────────────────

const TEACHER_ID = '11111111-1111-1111-1111-111111111111';

describe('approveTeacher', () => {
  it('flips approval to approved and audits teacher.approve', async () => {
    vi.mocked(getTeacherApprovalState).mockResolvedValue({ approvalStatus: 'pending' });
    vi.mocked(insertAdminAction).mockResolvedValue({} as never);

    await approveTeacher(makeUser('admin'), TEACHER_ID);

    expect(setTeacherApproval).toHaveBeenCalledWith(TEACHER_ID, 'approved');
    expect(insertAdminAction).toHaveBeenCalledWith('user-admin', {
      action_type: 'teacher.approve',
      target_entity_type: 'teacher_profile',
      target_entity_id: TEACHER_ID,
      notes: null,
    });
  });

  it('rejects (409) when the teacher is not pending', async () => {
    vi.mocked(getTeacherApprovalState).mockResolvedValue({ approvalStatus: 'approved' });

    await expect(approveTeacher(makeUser('admin'), TEACHER_ID)).rejects.toMatchObject({ statusCode: 409 });
    expect(setTeacherApproval).not.toHaveBeenCalled();
  });

  it('404 when the teacher profile is missing', async () => {
    vi.mocked(getTeacherApprovalState).mockResolvedValue(null);

    await expect(approveTeacher(makeUser('admin'), TEACHER_ID)).rejects.toMatchObject({ statusCode: 404 });
    expect(setTeacherApproval).not.toHaveBeenCalled();
  });
});

describe('rejectTeacher', () => {
  it('sets approval rejected and audits the reason', async () => {
    vi.mocked(getTeacherApprovalState).mockResolvedValue({ approvalStatus: 'pending' });
    vi.mocked(insertAdminAction).mockResolvedValue({} as never);

    await rejectTeacher(makeUser('admin'), TEACHER_ID, 'תעודות חסרות');

    expect(setTeacherApproval).toHaveBeenCalledWith(TEACHER_ID, 'rejected');
    expect(insertAdminAction).toHaveBeenCalledWith('user-admin', {
      action_type: 'teacher.reject',
      target_entity_type: 'teacher_profile',
      target_entity_id: TEACHER_ID,
      notes: 'תעודות חסרות',
    });
  });
});

describe('getTeacherApprovalQueue', () => {
  it('shapes pending rows with subjects/levels from aggregates', async () => {
    vi.mocked(listPendingApprovals).mockResolvedValue({
      rows: [
        {
          profileId: TEACHER_ID,
          userId: 'u-1',
          fullName: 'מורה ממתינה',
          email: 'pending@example.com',
          hourlyRate: 120,
          bio: 'ניסיון רב',
          joinedAt: '2026-05-01T00:00:00.000Z',
        },
      ],
      total: 1,
    });
    vi.mocked(getTeacherAggregates).mockResolvedValue(
      new Map([[TEACHER_ID, { subjects: ['מתמטיקה'], levels: ['תיכון'], completedLessons: 0, activeStudents: 0, approved: 0, totalBookings: 0 }]]),
    );

    const result = await getTeacherApprovalQueue({ page: 1, per_page: 25 });

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: TEACHER_ID,
      full_name: 'מורה ממתינה',
      subjects: ['מתמטיקה'],
      levels: ['תיכון'],
      hourly_rate: 120,
    });
  });
});

describe('Teacher approval route authorization', () => {
  it('401 unauthenticated; 403 non-admin (queue)', async () => {
    const noAuth = await request(buildApp()).get('/api/admin/teacher-approvals');
    expect(noAuth.status).toBe(401);

    vi.mocked(verifyAccessToken).mockResolvedValueOnce(makeAuthContext('teacher'));
    const nonAdmin = await request(buildApp())
      .get('/api/admin/teacher-approvals')
      .set('Authorization', 'Bearer teacher-token');
    expect(nonAdmin.status).toBe(403);
  });

  it('200 queue for admin', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(makeAuthContext('admin'));
    vi.mocked(listPendingApprovals).mockResolvedValue({ rows: [], total: 0 });
    vi.mocked(getTeacherAggregates).mockResolvedValue(new Map());

    const response = await request(buildApp())
      .get('/api/admin/teacher-approvals')
      .set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ items: [], page: 1, per_page: 25, total: 0, total_pages: 0 });
  });

  it('422 when reject is missing a reason', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(makeAuthContext('admin'));

    const response = await request(buildApp())
      .post(`/api/admin/teacher-approvals/${TEACHER_ID}/reject`)
      .set('Authorization', 'Bearer admin-token')
      .send({ reason: '' });

    expect(response.status).toBe(422);
    expect(setTeacherApproval).not.toHaveBeenCalled();
  });

  it('200 approve for admin', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(makeAuthContext('admin'));
    vi.mocked(getTeacherApprovalState).mockResolvedValue({ approvalStatus: 'pending' });
    vi.mocked(insertAdminAction).mockResolvedValue({} as never);

    const response = await request(buildApp())
      .post(`/api/admin/teacher-approvals/${TEACHER_ID}/approve`)
      .set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ approval_status: 'approved' });
  });
});

// ── Matching Insights (marketplace BI) ──────────────────────────────────────────

function mockInsightsData() {
  vi.mocked(getDemandBySubject).mockResolvedValue(
    new Map([
      ['phys', { searches: 48, thisMonth: 0, lastMonth: 0 }],
      ['eng', { searches: 2, thisMonth: 0, lastMonth: 0 }],
      ['chem', { searches: 20, thisMonth: 14, lastMonth: 10 }], // +40% MoM
    ]),
  );
  vi.mocked(getSupplyBySubject).mockResolvedValue(new Map([['phys', 3], ['eng', 5], ['chem', 2]]));
  vi.mocked(getCompletedLessonsBySubject).mockResolvedValue(new Map([['phys', 12]]));
  vi.mocked(getBookingsBySubject).mockResolvedValue(new Map([['phys', 20]]));
  vi.mocked(getOffCatalogFailedSearches).mockResolvedValue([
    { subject_text: 'אסטרופיזיקה', level: 'תיכון', count: 5, last_occurrence: '2026-06-01T00:00:00.000Z' },
  ]);
  vi.mocked(getUnmatchedOpenCount).mockResolvedValue(7);
  vi.mocked(getOverviewCounts).mockResolvedValue({
    ...ZERO_COUNTS,
    studentIntakesTotal: 1000,
    intakesMatched: 820,
    bookingRequestsTotal: 410,
    bookingRequestsApproved: 320,
    completedLessons: 280,
  });
  vi.mocked(batchGetSubjectNamesByIds).mockResolvedValue(
    new Map([['phys', 'פיזיקה'], ['eng', 'אנגלית'], ['chem', 'כימיה']]),
  );
}

describe('getMatchingInsights', () => {
  it('computes demand/supply ratios, statuses and shortage-first ordering', async () => {
    mockInsightsData();
    const result = await getMatchingInsights();

    const phys = result.demand_supply.find((r) => r.subject_id === 'phys')!;
    expect(phys).toMatchObject({ searches: 48, active_teachers: 3, ratio: 16, status: 'critical_shortage' });
    const eng = result.demand_supply.find((r) => r.subject_id === 'eng')!;
    expect(eng.status).toBe('healthy');
    // Shortage-first: critical subjects ahead of healthy.
    expect(result.demand_supply[0].status).toBe('critical_shortage');
    expect(result.demand_supply[result.demand_supply.length - 1].subject_id).toBe('eng');
  });

  it('builds the funnel from the overview counts + conversions', async () => {
    mockInsightsData();
    const result = await getMatchingInsights();

    expect(result.funnel).toMatchObject({
      searches: 1000,
      matches_generated: 820,
      booking_requests: 410,
      approved: 320,
      completed: 280,
    });
    expect(result.funnel.conversions.search_to_match).toBe(0.82);
    expect(result.funnel.conversions.booking_to_approved).toBeCloseTo(0.7805, 3);
  });

  it('derives recruit, growth and surplus recommendations from data', async () => {
    mockInsightsData();
    const result = await getMatchingInsights();
    const ids = result.recommendations.map((r) => r.id);

    expect(ids).toContain('rec-recruit-phys'); // critical shortage
    expect(ids).toContain('rec-growth-chem'); // +40% MoM
    expect(ids).toContain('rec-surplus-eng'); // surplus supply
    const growth = result.recommendations.find((r) => r.id === 'rec-growth-chem')!;
    expect(growth.message).toContain('40%');
    expect(growth.severity).toBe('opportunity');
  });

  it('passes through failed-search signals (off-catalog + unmatched open)', async () => {
    mockInsightsData();
    const result = await getMatchingInsights();

    expect(result.failed_searches.unmatched_open_count).toBe(7);
    expect(result.failed_searches.off_catalog[0]).toMatchObject({ subject_text: 'אסטרופיזיקה', count: 5 });
  });
});

describe('GET /api/admin/matching-insights', () => {
  it('401 unauthenticated; 403 non-admin', async () => {
    const noAuth = await request(buildApp()).get('/api/admin/matching-insights');
    expect(noAuth.status).toBe(401);

    vi.mocked(verifyAccessToken).mockResolvedValueOnce(makeAuthContext('teacher'));
    const nonAdmin = await request(buildApp())
      .get('/api/admin/matching-insights')
      .set('Authorization', 'Bearer teacher-token');
    expect(nonAdmin.status).toBe(403);
  });

  it('200 with the 5-section envelope for an admin', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce(makeAuthContext('admin'));
    mockInsightsData();

    const response = await request(buildApp())
      .get('/api/admin/matching-insights')
      .set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('demand_supply');
    expect(response.body.data).toHaveProperty('failed_searches');
    expect(response.body.data).toHaveProperty('most_requested');
    expect(response.body.data).toHaveProperty('funnel');
    expect(response.body.data).toHaveProperty('recommendations');
  });
});
