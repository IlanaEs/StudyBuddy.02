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
  // A resolution failure (e.g. transient DB error) degrades to an empty
  // dashboard rather than a 500 — the page still renders.
  const student = await safe('student', getStudentByUserId(currentUser.id), null);
  if (!student) {
    return emptyDashboard();
  }

  // ── Parallel data fetch ────────────────────────────────────────────────────
  // Each section degrades independently: one failing query (e.g. a column not
  // present in this environment) must not take down the whole dashboard. We use
  // allSettled-style per-section fallbacks instead of Promise.all (reject-all).
  const [nextLesson, upcoming, completed, teachers, bookingRequests, latestNote, monthly] =
    await Promise.all([
      safe('next_lesson', getNextScheduledLesson(student.id), null),
      safe('upcoming_lessons', getUpcomingLessons(student.id, 10), []),
      safe('recent_lessons', getCompletedLessons(student.id, 20), []),
      safe('my_teachers', getTeachersLast3Months(student.id), []),
      safe('booking_requests', getStudentBookingRequests(student.id), []),
      safe('recent_materials', getLatestLessonNoteDetailed(student.id), null),
      safe('monthly_activity', getMonthlyCompletedMinutes(student.id), {
        totalMinutes: 0,
        monthLabel: currentMonthLabel(),
      }),
    ]);

  // ── Recent materials follow-ups (open homework count + lesson date) ────────
  const [openHomeworkCount, latestMaterialLessonAt] = await Promise.all([
    latestNote ? safe('homework_count', countOpenHomeworkByLessonNoteId(latestNote.lessonNoteId), 0) : Promise.resolve(0),
    latestNote ? safe('material_date', getLessonStartAt(latestNote.lessonId), null) : Promise.resolve(null),
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
  const teacherDisplays = await safe(
    'teacher_displays',
    batchGetTeacherDisplaysByProfileIds([...new Set(teacherProfileIds)]),
    new Map(),
  );

  // ── Batch-resolve subject names ────────────────────────────────────────────
  const subjectIds = [
    ...(nextLesson?.subjectId ? [nextLesson.subjectId] : []),
    ...upcoming.flatMap((l) => (l.subjectId ? [l.subjectId] : [])),
    ...completed.flatMap((l) => (l.subjectId ? [l.subjectId] : [])),
    ...teachers.flatMap((t) => (t.lastSubjectId ? [t.lastSubjectId] : [])),
  ];
  const subjectNames = await safe('subject_names', batchGetSubjectNamesByIds(subjectIds), new Map<string, string>());

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

// Awaits a section promise, returning a fallback (and logging) on failure so a
// single bad section can never 500 the aggregate. Console errors are kept for
// debugging; the client only ever sees a valid payload.
async function safe<T>(label: string, promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    console.error(`[studentDashboard] section "${label}" failed; degrading to empty.`, err);
    return fallback;
  }
}

function currentMonthLabel(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function emptyDashboard(): StudentDashboardPayload {
  return {
    student: null,
    next_lesson: null,
    my_teachers: [],
    booking_requests: [],
    recent_materials: null,
    monthly_activity: {
      total_minutes: 0,
      month_label: currentMonthLabel(),
    },
    upcoming_lessons: [],
    recent_lessons: [],
    quick_actions: { can_find_teacher: true },
  };
}
