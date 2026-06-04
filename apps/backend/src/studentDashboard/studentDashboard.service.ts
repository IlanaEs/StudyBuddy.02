// Business logic only. No DB access. No HTTP concerns.

import type { LocalUser } from '../auth/authTypes.js';
import { batchGetSubjectNamesByIds } from '../parentDashboard/parentDashboard.repository.js';
import type { StudentDashboardPayload } from './studentDashboard.types.js';
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
} from './studentDashboard.repository.js';

export async function getStudentDashboardService(
  currentUser: LocalUser,
): Promise<StudentDashboardPayload> {
  // ── Resolve the student's own profile ──────────────────────────────────────
  const student = await getStudentByUserId(currentUser.id);
  if (!student) {
    return emptyDashboard();
  }

  // ── Parallel data fetch ────────────────────────────────────────────────────
  const [nextLesson, upcoming, completed, teachers, bookingRequests, latestNote, monthly] =
    await Promise.all([
      getNextScheduledLesson(student.id),
      getUpcomingLessons(student.id, 10),
      getCompletedLessons(student.id, 20),
      getTeachersLast3Months(student.id),
      getStudentBookingRequests(student.id),
      getLatestLessonNoteDetailed(student.id),
      getMonthlyCompletedMinutes(student.id),
    ]);

  // ── Recent materials follow-ups (open homework count + lesson date) ────────
  const [openHomeworkCount, latestMaterialLessonAt] = await Promise.all([
    latestNote ? countOpenHomeworkByLessonNoteId(latestNote.lessonNoteId) : Promise.resolve(0),
    latestNote ? getLessonStartAt(latestNote.lessonId) : Promise.resolve(null),
  ]);

  // ── Batch-resolve teacher displays (name + photo) ──────────────────────────
  const teacherProfileIds = [
    ...(nextLesson ? [nextLesson.teacherProfileId] : []),
    ...upcoming.map((l) => l.teacherProfileId),
    ...completed.map((l) => l.teacherProfileId),
    ...teachers.map((t) => t.teacherProfileId),
    ...bookingRequests.map((b) => b.teacherProfileId),
    ...(latestNote ? [latestNote.teacherProfileId] : []),
  ];
  const teacherDisplays = await batchGetTeacherDisplaysByProfileIds([...new Set(teacherProfileIds)]);

  // ── Batch-resolve subject names ────────────────────────────────────────────
  const subjectIds = [
    ...(nextLesson?.subjectId ? [nextLesson.subjectId] : []),
    ...upcoming.flatMap((l) => (l.subjectId ? [l.subjectId] : [])),
    ...completed.flatMap((l) => (l.subjectId ? [l.subjectId] : [])),
    ...teachers.flatMap((t) => (t.lastSubjectId ? [t.lastSubjectId] : [])),
  ];
  const subjectNames = await batchGetSubjectNamesByIds(subjectIds);

  const teacherName = (id: string): string => teacherDisplays.get(id)?.name ?? 'מורה לא ידוע';
  const teacherPhoto = (id: string): string | null => teacherDisplays.get(id)?.photoUrl ?? null;
  const subjectName = (id: string | null): string | null => (id ? (subjectNames.get(id) ?? null) : null);

  // ── Assemble payload ───────────────────────────────────────────────────────
  return {
    student: {
      id: student.id,
      first_name: student.fullName,
      grade_level: student.gradeLevel,
    },

    next_lesson: nextLesson
      ? {
          id: nextLesson.id,
          subject_name: subjectName(nextLesson.subjectId),
          teacher_name: teacherName(nextLesson.teacherProfileId),
          teacher_photo_url: teacherPhoto(nextLesson.teacherProfileId),
          starts_at: nextLesson.scheduledStartAt,
          ends_at: nextLesson.scheduledEndAt,
          status: nextLesson.status,
          meeting_link: nextLesson.meetingLink,
        }
      : null,

    my_teachers: teachers.map((t) => ({
      teacher_id: t.teacherProfileId,
      teacher_name: teacherName(t.teacherProfileId),
      teacher_photo_url: teacherPhoto(t.teacherProfileId),
      last_subject_name: subjectName(t.lastSubjectId),
      last_lesson_at: t.lastLessonAt,
    })),

    booking_requests: bookingRequests.map((b) => ({
      id: b.id,
      teacher_name: teacherName(b.teacherProfileId),
      requested_start_at: b.requestedStartAt,
      status: b.status,
      updated_at: b.updatedAt,
    })),

    recent_materials: latestNote
      ? {
          lesson_note_id: latestNote.lessonNoteId,
          shared_summary: latestNote.sharedSummary,
          lesson_at: latestMaterialLessonAt,
          teacher_name: teacherName(latestNote.teacherProfileId),
          open_homework_count: openHomeworkCount,
        }
      : null,

    monthly_activity: {
      total_minutes: monthly.totalMinutes,
      month_label: monthly.monthLabel,
    },

    upcoming_lessons: upcoming.map((l) => ({
      id: l.id,
      subject_name: subjectName(l.subjectId),
      teacher_name: teacherName(l.teacherProfileId),
      starts_at: l.scheduledStartAt,
      ends_at: l.scheduledEndAt,
      status: l.status,
    })),

    recent_lessons: completed.map((l) => ({
      id: l.id,
      date: l.scheduledStartAt,
      subject_name: subjectName(l.subjectId),
      teacher_name: teacherName(l.teacherProfileId),
      status: l.status,
    })),

    quick_actions: { can_find_teacher: true },
  };
}

// ── Private helpers ───────────────────────────────────────────────────────────

function emptyDashboard(): StudentDashboardPayload {
  const now = new Date();
  return {
    student: null,
    next_lesson: null,
    my_teachers: [],
    booking_requests: [],
    recent_materials: null,
    monthly_activity: {
      total_minutes: 0,
      month_label: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`,
    },
    upcoming_lessons: [],
    recent_lessons: [],
    quick_actions: { can_find_teacher: true },
  };
}
