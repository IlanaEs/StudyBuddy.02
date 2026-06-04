import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Module mocks (hoisted before imports) ─────────────────────────────────────

vi.mock('../src/studentDashboard/studentDashboard.repository.js', () => ({
  getStudentByUserId: vi.fn(),
  getNextScheduledLesson: vi.fn(),
  getUpcomingLessons: vi.fn(),
  getCompletedLessons: vi.fn(),
  getTeachersLast3Months: vi.fn(),
  getStudentBookingRequests: vi.fn(),
  getLatestLessonNoteDetailed: vi.fn(),
  getMonthlyCompletedMinutes: vi.fn(),
  countOpenHomeworkByLessonNoteId: vi.fn(),
  getLessonStartAt: vi.fn(),
  batchGetTeacherDisplaysByProfileIds: vi.fn(),
}));

vi.mock('../src/parentDashboard/parentDashboard.repository.js', () => ({
  batchGetSubjectNamesByIds: vi.fn(),
}));

import { getStudentDashboardService } from '../src/studentDashboard/studentDashboard.service.js';
import {
  batchGetTeacherDisplaysByProfileIds,
  countOpenHomeworkByLessonNoteId,
  getCompletedLessons,
  getLatestLessonNoteDetailed,
  getLessonStartAt,
  getMonthlyCompletedMinutes,
  getNextScheduledLesson,
  getStudentBookingRequests,
  getStudentByUserId,
  getTeachersLast3Months,
  getUpcomingLessons,
} from '../src/studentDashboard/studentDashboard.repository.js';
import { batchGetSubjectNamesByIds } from '../src/parentDashboard/parentDashboard.repository.js';
import type { LocalUser } from '../src/auth/authTypes.js';

const student: LocalUser = {
  id: 'user-1',
  supabase_auth_user_id: 'auth-1',
  email: 's@example.com',
  role: 'student',
  full_name: 'דנה',
  status: 'active',
};

function resolveAllEmpty() {
  vi.mocked(getNextScheduledLesson).mockResolvedValue(null);
  vi.mocked(getUpcomingLessons).mockResolvedValue([]);
  vi.mocked(getCompletedLessons).mockResolvedValue([]);
  vi.mocked(getTeachersLast3Months).mockResolvedValue([]);
  vi.mocked(getStudentBookingRequests).mockResolvedValue([]);
  vi.mocked(getLatestLessonNoteDetailed).mockResolvedValue(null);
  vi.mocked(getMonthlyCompletedMinutes).mockResolvedValue({ totalMinutes: 0, monthLabel: '2026-06' });
  vi.mocked(countOpenHomeworkByLessonNoteId).mockResolvedValue(0);
  vi.mocked(getLessonStartAt).mockResolvedValue(null);
  vi.mocked(batchGetTeacherDisplaysByProfileIds).mockResolvedValue(new Map());
  vi.mocked(batchGetSubjectNamesByIds).mockResolvedValue(new Map());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getStudentDashboardService', () => {
  it('returns an empty dashboard when the user has no student profile', async () => {
    vi.mocked(getStudentByUserId).mockResolvedValue(null);

    const payload = await getStudentDashboardService(student);

    expect(payload.student).toBeNull();
    expect(payload.next_lesson).toBeNull();
    expect(payload.my_teachers).toEqual([]);
    expect(payload.booking_requests).toEqual([]);
    expect(payload.quick_actions.can_find_teacher).toBe(true);
    // No data fetches happen once the student is missing.
    expect(getNextScheduledLesson).not.toHaveBeenCalled();
  });

  it('resolves teacher + subject names for the next lesson', async () => {
    vi.mocked(getStudentByUserId).mockResolvedValue({ id: 'stu-1', fullName: 'דנה', gradeLevel: 'י׳' });
    resolveAllEmpty();
    vi.mocked(getNextScheduledLesson).mockResolvedValue({
      id: 'les-1',
      subjectId: 'sub-1',
      teacherProfileId: 'tp-1',
      scheduledStartAt: '2026-06-10T10:00:00.000Z',
      scheduledEndAt: '2026-06-10T11:00:00.000Z',
      status: 'scheduled',
    });
    vi.mocked(batchGetTeacherDisplaysByProfileIds).mockResolvedValue(
      new Map([['tp-1', { name: 'מר כהן', photoUrl: 'http://img/x.png' }]]),
    );
    vi.mocked(batchGetSubjectNamesByIds).mockResolvedValue(new Map([['sub-1', 'מתמטיקה']]));

    const payload = await getStudentDashboardService(student);

    expect(payload.student).toEqual({ id: 'stu-1', first_name: 'דנה', grade_level: 'י׳' });
    expect(payload.next_lesson).toEqual({
      id: 'les-1',
      subject_name: 'מתמטיקה',
      teacher_name: 'מר כהן',
      teacher_photo_url: 'http://img/x.png',
      starts_at: '2026-06-10T10:00:00.000Z',
      ends_at: '2026-06-10T11:00:00.000Z',
      status: 'scheduled',
    });
  });

  it('maps my_teachers with resolved subject + teacher display', async () => {
    vi.mocked(getStudentByUserId).mockResolvedValue({ id: 'stu-1', fullName: 'דנה', gradeLevel: null });
    resolveAllEmpty();
    vi.mocked(getTeachersLast3Months).mockResolvedValue([
      { teacherProfileId: 'tp-1', lastSubjectId: 'sub-1', lastLessonAt: '2026-05-01T09:00:00.000Z' },
    ]);
    vi.mocked(batchGetTeacherDisplaysByProfileIds).mockResolvedValue(
      new Map([['tp-1', { name: 'מר כהן', photoUrl: null }]]),
    );
    vi.mocked(batchGetSubjectNamesByIds).mockResolvedValue(new Map([['sub-1', 'פיזיקה']]));

    const payload = await getStudentDashboardService(student);

    expect(payload.my_teachers).toEqual([
      {
        teacher_id: 'tp-1',
        teacher_name: 'מר כהן',
        teacher_photo_url: null,
        last_subject_name: 'פיזיקה',
        last_lesson_at: '2026-05-01T09:00:00.000Z',
      },
    ]);
  });

  it('surfaces booking requests and the open homework count for recent materials', async () => {
    vi.mocked(getStudentByUserId).mockResolvedValue({ id: 'stu-1', fullName: 'דנה', gradeLevel: null });
    resolveAllEmpty();
    vi.mocked(getStudentBookingRequests).mockResolvedValue([
      { id: 'br-1', teacherProfileId: 'tp-1', requestedStartAt: '2026-06-12T08:00:00.000Z', status: 'pending', updatedAt: '2026-06-04T08:00:00.000Z' },
    ]);
    vi.mocked(getLatestLessonNoteDetailed).mockResolvedValue({
      lessonNoteId: 'ln-1',
      sharedSummary: 'כל הכבוד',
      lessonId: 'les-9',
      teacherProfileId: 'tp-1',
      createdAt: '2026-06-01T00:00:00.000Z',
    });
    vi.mocked(countOpenHomeworkByLessonNoteId).mockResolvedValue(2);
    vi.mocked(getLessonStartAt).mockResolvedValue('2026-06-01T09:00:00.000Z');
    vi.mocked(batchGetTeacherDisplaysByProfileIds).mockResolvedValue(
      new Map([['tp-1', { name: 'מר כהן', photoUrl: null }]]),
    );

    const payload = await getStudentDashboardService(student);

    expect(payload.booking_requests).toEqual([
      { id: 'br-1', teacher_name: 'מר כהן', requested_start_at: '2026-06-12T08:00:00.000Z', status: 'pending', updated_at: '2026-06-04T08:00:00.000Z' },
    ]);
    expect(payload.recent_materials).toEqual({
      lesson_note_id: 'ln-1',
      shared_summary: 'כל הכבוד',
      lesson_at: '2026-06-01T09:00:00.000Z',
      teacher_name: 'מר כהן',
      open_homework_count: 2,
    });
  });
});
