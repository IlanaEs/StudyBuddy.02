import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Module mocks (hoisted before imports) ─────────────────────────────────────

vi.mock('../src/bookingRequests/bookingRequests.repository.js', () => ({
  getMatchResultById: vi.fn(),
  getStudentIntakeById: vi.fn(),
  getStudentById: vi.fn(),
  getTeacherProfileById: vi.fn(),
  getActiveBookingRequestForIntake: vi.fn(),
  insertBookingRequestViaClient: vi.fn(),
  markMatchResultSelectedViaClient: vi.fn(),
  // Imported by the service module but unused by createBookingRequest:
  getTeacherProfileByUserId: vi.fn(),
  getActiveTeacherProfileById: vi.fn(),
  getBookingRequestById: vi.fn(),
  getLessonByBookingRequestId: vi.fn(),
  getLatestLessonForStudentTeacher: vi.fn(),
  getStudentIdByUserId: vi.fn(),
  checkOverlappingScheduledLessonViaClient: vi.fn(),
  updateBookingRequestStatus: vi.fn(),
  updateLessonCalendarFields: vi.fn(),
  insertLessonViaClient: vi.fn(),
  getBookingRequestsByTeacherId: vi.fn(),
  batchGetStudentNamesByStudentIds: vi.fn(),
}));

vi.mock('../src/teachers/teacherCalendarService.js', () => ({
  createGoogleCalendarEventWithMeet: vi.fn(),
}));

import { createBookingRequest } from '../src/bookingRequests/bookingRequests.service.js';
import {
  getActiveBookingRequestForIntake,
  getMatchResultById,
  getStudentById,
  getStudentIntakeById,
  getTeacherProfileById,
  insertBookingRequestViaClient,
  markMatchResultSelectedViaClient,
} from '../src/bookingRequests/bookingRequests.repository.js';
import type { LocalUser } from '../src/auth/authTypes.js';

const body = {
  match_result_id: '11111111-1111-1111-1111-111111111111',
  requested_start_at: '2026-06-20T10:00:00.000Z',
  requested_end_at: '2026-06-20T11:00:00.000Z',
};

const independentStudent: LocalUser = {
  id: 'user-1',
  supabase_auth_user_id: 'auth-1',
  email: 's@example.com',
  role: 'student',
  full_name: 'דנה',
  status: 'active',
};

const parentUser: LocalUser = { ...independentStudent, id: 'parent-1', role: 'parent' };

function primeHappyPath(student: { id: string; userId: string | null; parentUserId: string | null }) {
  vi.mocked(getMatchResultById).mockResolvedValue({ id: 'mr-1', intakeId: 'in-1', teacherId: 'tp-1' });
  vi.mocked(getStudentIntakeById).mockResolvedValue({
    id: 'in-1',
    studentId: student.id,
    subjectId: 'sub-1',
    locationPreference: 'online',
    status: 'open',
  });
  vi.mocked(getStudentById).mockResolvedValue(student);
  vi.mocked(getTeacherProfileById).mockResolvedValue({ id: 'tp-1' });
  vi.mocked(getActiveBookingRequestForIntake).mockResolvedValue(null);
  vi.mocked(markMatchResultSelectedViaClient).mockResolvedValue(undefined);
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
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createBookingRequest (match-driven)', () => {
  it('creates a pending request for an INDEPENDENT student (no 422)', async () => {
    primeHappyPath({ id: 'stu-1', userId: 'user-1', parentUserId: null });

    const result = await createBookingRequest(body, independentStudent);

    expect(result.status).toBe('pending');
    expect(result.matchResultId).toBe(body.match_result_id);
    expect(insertBookingRequestViaClient).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: 'stu-1', teacherId: 'tp-1', matchResultId: body.match_result_id }),
    );
  });

  it('still creates a pending request for a PARENT-MANAGED student', async () => {
    primeHappyPath({ id: 'stu-1', userId: null, parentUserId: 'parent-1' });

    const result = await createBookingRequest(body, parentUser);

    expect(result.status).toBe('pending');
    expect(insertBookingRequestViaClient).toHaveBeenCalledTimes(1);
  });

  it('403s when a student does not own the intake', async () => {
    primeHappyPath({ id: 'stu-1', userId: 'someone-else', parentUserId: null });

    await expect(createBookingRequest(body, independentStudent)).rejects.toMatchObject({ statusCode: 403 });
    expect(insertBookingRequestViaClient).not.toHaveBeenCalled();
  });

  it('422s on a closed intake', async () => {
    primeHappyPath({ id: 'stu-1', userId: 'user-1', parentUserId: null });
    vi.mocked(getStudentIntakeById).mockResolvedValue({
      id: 'in-1',
      studentId: 'stu-1',
      subjectId: 'sub-1',
      locationPreference: 'online',
      status: 'closed',
    });

    await expect(createBookingRequest(body, independentStudent)).rejects.toMatchObject({ statusCode: 422 });
    expect(insertBookingRequestViaClient).not.toHaveBeenCalled();
  });

  it('409s when an active booking already exists for the intake', async () => {
    primeHappyPath({ id: 'stu-1', userId: 'user-1', parentUserId: null });
    vi.mocked(getActiveBookingRequestForIntake).mockResolvedValue({ id: 'br-existing' });

    await expect(createBookingRequest(body, independentStudent)).rejects.toMatchObject({ statusCode: 409 });
    expect(insertBookingRequestViaClient).not.toHaveBeenCalled();
  });
});
