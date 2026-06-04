import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Module mocks (hoisted before imports) ─────────────────────────────────────

vi.mock('../src/bookingRequests/bookingRequests.repository.js', () => ({
  getStudentIdByUserId: vi.fn(),
  getActiveTeacherProfileById: vi.fn(),
  getLatestLessonForStudentTeacher: vi.fn(),
  checkOverlappingScheduledLessonViaClient: vi.fn(),
  insertBookingRequestViaClient: vi.fn(),
  // Unused by createRebookRequest but imported by the service module:
  getMatchResultById: vi.fn(),
  getStudentIntakeById: vi.fn(),
  getStudentById: vi.fn(),
  getTeacherProfileById: vi.fn(),
  getTeacherProfileByUserId: vi.fn(),
  getActiveBookingRequestForIntake: vi.fn(),
  getBookingRequestById: vi.fn(),
  getLessonByBookingRequestId: vi.fn(),
  markMatchResultSelectedViaClient: vi.fn(),
  updateBookingRequestStatus: vi.fn(),
  updateLessonMeetingLink: vi.fn(),
  insertLessonViaClient: vi.fn(),
  getBookingRequestsByTeacherId: vi.fn(),
  batchGetStudentNamesByStudentIds: vi.fn(),
}));

vi.mock('../src/teachers/teacherCalendarService.js', () => ({
  createGoogleCalendarEventWithMeet: vi.fn(),
}));

import { createRebookRequest } from '../src/bookingRequests/bookingRequests.service.js';
import {
  checkOverlappingScheduledLessonViaClient,
  getActiveTeacherProfileById,
  getLatestLessonForStudentTeacher,
  getStudentIdByUserId,
  insertBookingRequestViaClient,
} from '../src/bookingRequests/bookingRequests.repository.js';
import { AppError } from '../src/errors/AppError.js';
import type { LocalUser } from '../src/auth/authTypes.js';

const studentUser: LocalUser = {
  id: 'user-1',
  supabase_auth_user_id: 'auth-1',
  email: 's@example.com',
  role: 'student',
  full_name: 'דנה',
  status: 'active',
};

const body = {
  teacher_id: '11111111-1111-1111-1111-111111111111',
  requested_start_at: '2026-06-20T10:00:00.000Z',
  requested_end_at: '2026-06-20T11:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createRebookRequest', () => {
  it('rejects non-student callers with 403', async () => {
    const parent = { ...studentUser, role: 'parent' as const };
    await expect(createRebookRequest(body, parent)).rejects.toMatchObject({ statusCode: 403 });
    expect(getStudentIdByUserId).not.toHaveBeenCalled();
  });

  it('404s when the caller has no student profile', async () => {
    vi.mocked(getStudentIdByUserId).mockResolvedValue(null);
    await expect(createRebookRequest(body, studentUser)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('404s when the teacher is missing or inactive', async () => {
    vi.mocked(getStudentIdByUserId).mockResolvedValue('stu-1');
    vi.mocked(getActiveTeacherProfileById).mockResolvedValue(null);
    await expect(createRebookRequest(body, studentUser)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('403s when there is no prior lesson with the teacher (known-teacher guard)', async () => {
    vi.mocked(getStudentIdByUserId).mockResolvedValue('stu-1');
    vi.mocked(getActiveTeacherProfileById).mockResolvedValue({ id: body.teacher_id });
    vi.mocked(getLatestLessonForStudentTeacher).mockResolvedValue(null);

    await expect(createRebookRequest(body, studentUser)).rejects.toMatchObject({ statusCode: 403 });
    expect(insertBookingRequestViaClient).not.toHaveBeenCalled();
  });

  it('inserts a pending request with a null match_result_id on success', async () => {
    vi.mocked(getStudentIdByUserId).mockResolvedValue('stu-1');
    vi.mocked(getActiveTeacherProfileById).mockResolvedValue({ id: body.teacher_id });
    vi.mocked(getLatestLessonForStudentTeacher).mockResolvedValue({ subjectId: 'sub-1', locationType: 'online' });
    vi.mocked(checkOverlappingScheduledLessonViaClient).mockResolvedValue(undefined);
    vi.mocked(insertBookingRequestViaClient).mockImplementation(async (input) => ({
      id: 'br-new',
      studentId: input.studentId,
      teacherId: input.teacherId,
      matchResultId: input.matchResultId,
      requestedStartAt: input.requestedStartAt,
      requestedEndAt: input.requestedEndAt,
      status: 'pending',
      studentMessage: input.studentMessage,
      teacherResponseMessage: null,
      createdAt: 'now',
      updatedAt: 'now',
    }));

    const result = await createRebookRequest(body, studentUser);

    expect(checkOverlappingScheduledLessonViaClient).toHaveBeenCalledWith(
      body.teacher_id,
      body.requested_start_at,
      body.requested_end_at,
    );
    expect(insertBookingRequestViaClient).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: 'stu-1', teacherId: body.teacher_id, matchResultId: null }),
    );
    expect(result.status).toBe('pending');
    expect(result.matchResultId).toBeNull();
  });

  it('propagates the 409 overlap error and does not insert', async () => {
    vi.mocked(getStudentIdByUserId).mockResolvedValue('stu-1');
    vi.mocked(getActiveTeacherProfileById).mockResolvedValue({ id: body.teacher_id });
    vi.mocked(getLatestLessonForStudentTeacher).mockResolvedValue({ subjectId: null, locationType: 'online' });
    vi.mocked(checkOverlappingScheduledLessonViaClient).mockRejectedValue(
      new AppError('Teacher already has a scheduled lesson in this time range', 409),
    );

    await expect(createRebookRequest(body, studentUser)).rejects.toMatchObject({ statusCode: 409 });
    expect(insertBookingRequestViaClient).not.toHaveBeenCalled();
  });
});
