// Business logic only. No DB access. No HTTP concerns.

import { AppError } from '../errors/AppError.js';
import type { LocalUser } from '../auth/authTypes.js';
import type { HomeworkTaskRow, HomeworkTaskStatus, ParentDashboardPayload } from './parentDashboard.types.js';
import type { CreateChildBody, UpdateHomeworkTaskBody } from './parentDashboard.validation.js';
import { insertChildProfile } from '../students/students.repository.js';
import {
  approveLessonConfirmation,
  batchGetSubjectNamesByIds,
  batchGetTeacherNamesByProfileIds,
  batchGetUserNamesByIds,
  getBookingRequestsByStudentAndDateRange,
  getChildrenByParentUserId,
  getConfirmationStatusesByLessonIds,
  getHomeworkTaskById,
  getHomeworkTasksByLessonNoteId,
  getLessonConfirmationById,
  getLessonsByStudentAndDateRange,
  getLessonSubjectId,
  getLatestLessonNote,
  getParentTileBookingRequests,
  getPendingConfirmation,
  getNextLesson,
  getRecentLessons,
  getStudentByIdAndParent,
  getWeeklyFamilySchedule,
  updateHomeworkTaskStatus,
} from './parentDashboard.repository.js';

// Recently-declined booking requests stay visible for this long (then clear), so
// the parent sees a teacher's reject/expire once without it lingering forever.
const DECLINE_VISIBILITY_MS = 24 * 60 * 60 * 1000;

// ── Dashboard aggregation ─────────────────────────────────────────────────────

export async function getParentDashboardService(
  currentUser: LocalUser,
  studentId?: string,
): Promise<ParentDashboardPayload> {
  const parentUserId = currentUser.id;

  // ── Resolve children ───────────────────────────────────────────────────────
  const children = await getChildrenByParentUserId(parentUserId);

  if (children.length === 0) {
    return emptyDashboard(null, []);
  }

  // ── Resolve selected student ───────────────────────────────────────────────
  let selectedStudentId: string;

  if (studentId) {
    const owned = await getStudentByIdAndParent(studentId, parentUserId);
    if (!owned) throw new AppError('Forbidden', 403);
    selectedStudentId = owned.id;
  } else {
    selectedStudentId = children[0]!.id;
  }

  const selectedStudent = children.find((c) => c.id === selectedStudentId)!;

  // ── Parallel data fetch ────────────────────────────────────────────────────
  const childIds = children.map((c) => c.id);

  const [nextLessonRaw, pendingConfirmationRaw, latestNoteRaw, recentLessonsRaw, weeklyLessonsRaw, bookingRequestsRaw] =
    await Promise.all([
      getNextLesson(selectedStudentId),
      getPendingConfirmationWithLesson(selectedStudentId),
      getLatestLessonNote(selectedStudentId),
      getRecentLessons(selectedStudentId, 6),
      getWeeklyFamilySchedule(childIds),
      getParentTileBookingRequests(selectedStudentId),
    ]);

  // Keep all `pending`; keep `rejected`/`expired` only inside the transient
  // decline window so the parent sees the outcome once, then it clears.
  const declineCutoff = Date.now() - DECLINE_VISIBILITY_MS;
  const visibleBookingRequests = bookingRequestsRaw.filter(
    (b) => b.status === 'pending' || new Date(b.updatedAt).getTime() >= declineCutoff,
  );

  // ── Homework tasks for the latest note ────────────────────────────────────
  const homeworkTasks = latestNoteRaw
    ? await getHomeworkTasksByLessonNoteId(latestNoteRaw.id)
    : [];

  // ── Batch-resolve names ────────────────────────────────────────────────────
  // Collect all teacher profile IDs (from lessons)
  const teacherProfileIds = [
    ...(nextLessonRaw ? [nextLessonRaw.teacherProfileId] : []),
    ...recentLessonsRaw.map((l) => l.teacherProfileId),
    ...weeklyLessonsRaw.map((l) => l.teacherProfileId),
    ...visibleBookingRequests.map((b) => b.teacherProfileId),
  ];
  // Collect teacher user IDs (from lesson_confirmations, which use user IDs directly)
  const confirmationTeacherUserIds = pendingConfirmationRaw
    ? [pendingConfirmationRaw.confirmation.teacherUserId]
    : [];

  const [teacherProfileNames, confirmationTeacherNames] = await Promise.all([
    batchGetTeacherNamesByProfileIds([...new Set(teacherProfileIds)]),
    batchGetUserNamesByIds([...new Set(confirmationTeacherUserIds)]),
  ]);

  // ── Batch-resolve subject names ────────────────────────────────────────────
  const subjectIds = [
    ...(nextLessonRaw?.subjectId ? [nextLessonRaw.subjectId] : []),
    ...(pendingConfirmationRaw?.subjectId ? [pendingConfirmationRaw.subjectId] : []),
    ...recentLessonsRaw.flatMap((l) => (l.subjectId ? [l.subjectId] : [])),
    ...weeklyLessonsRaw.flatMap((l) => (l.subjectId ? [l.subjectId] : [])),
  ];
  const subjectNames = await batchGetSubjectNamesByIds(subjectIds);

  // ── Confirmation statuses for recent lessons ──────────────────────────────
  const recentLessonIds = recentLessonsRaw.map((l) => l.id);
  const confirmationStatuses = await getConfirmationStatusesByLessonIds(recentLessonIds);

  // ── Student name map (for weekly schedule) ────────────────────────────────
  const studentNameMap = new Map<string, string>(
    children.map((c) => [c.id, c.fullName]),
  );

  // ── Assemble payload ───────────────────────────────────────────────────────
  return {
    selected_student: {
      id: selectedStudent.id,
      first_name: selectedStudent.fullName,
      grade_level: selectedStudent.gradeLevel,
    },

    children: children.map((c) => ({ id: c.id, first_name: c.fullName })),

    next_lesson: nextLessonRaw
      ? {
          id: nextLessonRaw.id,
          subject_name: nextLessonRaw.subjectId
            ? (subjectNames.get(nextLessonRaw.subjectId) ?? null)
            : null,
          teacher_name: teacherProfileNames.get(nextLessonRaw.teacherProfileId) ?? 'מורה לא ידוע',
          starts_at: nextLessonRaw.startsAt,
          ends_at: nextLessonRaw.endsAt,
          meeting_link: nextLessonRaw.meetingLink,
          status: nextLessonRaw.status,
        }
      : null,

    pending_confirmation: pendingConfirmationRaw
      ? {
          id: pendingConfirmationRaw.confirmation.id,
          lesson_id: pendingConfirmationRaw.confirmation.lessonId,
          subject_name: pendingConfirmationRaw.subjectId
            ? (subjectNames.get(pendingConfirmationRaw.subjectId) ?? null)
            : null,
          teacher_name:
            confirmationTeacherNames.get(pendingConfirmationRaw.confirmation.teacherUserId) ??
            'מורה לא ידוע',
          amount: pendingConfirmationRaw.confirmation.amount,
          status: pendingConfirmationRaw.confirmation.status,
        }
      : null,

    latest_lesson_update: latestNoteRaw
      ? {
          lesson_note_id: latestNoteRaw.id,
          shared_summary: latestNoteRaw.sharedSummary,
          homework: homeworkTasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
          })),
          task_status: computeTaskStatus(homeworkTasks),
        }
      : null,

    recent_lessons: recentLessonsRaw.map((l) => {
      const conf = confirmationStatuses.get(l.id);
      return {
        id: l.id,
        date: l.scheduledStartAt,
        teacher_name: teacherProfileNames.get(l.teacherProfileId) ?? 'מורה לא ידוע',
        subject_name: l.subjectId ? (subjectNames.get(l.subjectId) ?? null) : null,
        status: l.status,
        confirmation_status: conf?.status ?? null,
      };
    }),

    pending_booking_requests: visibleBookingRequests.map((b) => ({
      id: b.id,
      teacher_name: teacherProfileNames.get(b.teacherProfileId) ?? 'מורה לא ידוע',
      requested_start_at: b.requestedStartAt,
      requested_end_at: b.requestedEndAt,
      status: b.status as 'pending' | 'rejected' | 'expired',
    })),

    quick_actions: {
      can_find_teacher: true,
    },

    weekly_family_schedule: weeklyLessonsRaw.map((l) => ({
      id: l.id,
      student_id: l.studentId,
      student_name: studentNameMap.get(l.studentId) ?? 'ילד לא ידוע',
      subject_name: l.subjectId ? (subjectNames.get(l.subjectId) ?? null) : null,
      teacher_name: teacherProfileNames.get(l.teacherProfileId) ?? 'מורה לא ידוע',
      starts_at: l.startsAt,
      ends_at: l.endsAt,
      status: l.status,
    })),
  };
}

// ── Children ──────────────────────────────────────────────────────────────────

// Lightweight children list (id + first name + grade) for the parent's own
// children — used by the Find-Tutor child-selection screen. Parent-scoped by
// parent_user_id; never exposes other parents' children.
export async function getParentChildrenService(
  currentUser: LocalUser,
): Promise<Array<{ id: string; first_name: string; grade_level: string | null }>> {
  const children = await getChildrenByParentUserId(currentUser.id);
  return children.map((c) => ({ id: c.id, first_name: c.fullName, grade_level: c.gradeLevel }));
}

// Lightweight "add another child" (name + grade only). Dedup guard: blocks an
// identical name (trimmed, case-insensitive) + grade under the same parent.
// Onboarding's ensureStudentProfile is intentionally NOT used here.
export async function createParentChildService(
  currentUser: LocalUser,
  body: CreateChildBody,
): Promise<{ id: string; first_name: string; grade_level: string | null }> {
  const name = body.child_name.trim();
  const grade = body.grade_level?.trim() ? body.grade_level.trim() : null;

  const existing = await getChildrenByParentUserId(currentUser.id);
  const duplicate = existing.some(
    (c) => c.fullName.trim().toLowerCase() === name.toLowerCase() && (c.gradeLevel ?? null) === grade,
  );
  if (duplicate) throw new AppError('כבר קיים/ת ילד/ה בשם וכיתה זהים.', 409);

  const id = await insertChildProfile(currentUser.id, name, grade);
  return { id, first_name: name, grade_level: grade };
}

// ── Child month schedule (calendar + day agenda) ──────────────────────────────

export type ChildScheduleLesson = {
  id: string;
  subject_name: string | null;
  teacher_name: string;
  starts_at: string;
  ends_at: string;
  status: string;
};

export type ChildScheduleBooking = {
  id: string;
  teacher_name: string;
  starts_at: string;
  ends_at: string;
  status: string;
};

export type ChildSchedulePayload = {
  lessons: ChildScheduleLesson[];
  booking_requests: ChildScheduleBooking[];
};

/**
 * Read-only schedule for a single child over [fromIso, toIso] — the data source
 * for the parent dashboard's monthly calendar + day agenda. Ownership is enforced
 * (reuses getStudentByIdAndParent → 403). Reads lesson + booking-request status
 * only; never lesson_confirmations/homework_tasks.
 */
export async function getChildScheduleService(
  currentUser: LocalUser,
  studentId: string,
  fromIso: string,
  toIso: string,
): Promise<ChildSchedulePayload> {
  const owned = await getStudentByIdAndParent(studentId, currentUser.id);
  if (!owned) throw new AppError('Forbidden', 403);

  const [lessons, bookings] = await Promise.all([
    getLessonsByStudentAndDateRange(studentId, fromIso, toIso),
    getBookingRequestsByStudentAndDateRange(studentId, fromIso, toIso),
  ]);

  const teacherProfileIds = [
    ...lessons.map((l) => l.teacherProfileId),
    ...bookings.map((b) => b.teacherProfileId),
  ];
  const subjectIds = lessons.flatMap((l) => (l.subjectId ? [l.subjectId] : []));

  const [teacherNames, subjectNames] = await Promise.all([
    batchGetTeacherNamesByProfileIds([...new Set(teacherProfileIds)]),
    batchGetSubjectNamesByIds(subjectIds),
  ]);

  return {
    lessons: lessons.map((l) => ({
      id: l.id,
      subject_name: l.subjectId ? (subjectNames.get(l.subjectId) ?? null) : null,
      teacher_name: teacherNames.get(l.teacherProfileId) ?? 'מורה לא ידוע',
      starts_at: l.startsAt,
      ends_at: l.endsAt,
      status: l.status,
    })),
    booking_requests: bookings.map((b) => ({
      id: b.id,
      teacher_name: teacherNames.get(b.teacherProfileId) ?? 'מורה לא ידוע',
      starts_at: b.startsAt,
      ends_at: b.endsAt,
      status: b.status,
    })),
  };
}

// ── Approval ──────────────────────────────────────────────────────────────────

export async function approveLessonConfirmationService(
  confirmationId: string,
  currentUser: LocalUser,
) {
  const confirmation = await getLessonConfirmationById(confirmationId);

  if (!confirmation) throw new AppError('Lesson confirmation not found', 404);

  // Parent must own the record.
  if (confirmation.parentUserId !== currentUser.id) {
    throw new AppError('Forbidden', 403);
  }

  if (confirmation.status !== 'pending') {
    throw new AppError(
      `Confirmation cannot be approved (current status: ${confirmation.status})`,
      409,
    );
  }

  return approveLessonConfirmation(confirmationId);
}

// ── Homework task status update ───────────────────────────────────────────────

export async function updateHomeworkTaskStatusService(
  taskId: string,
  body: UpdateHomeworkTaskBody,
  currentUser: LocalUser,
) {
  const task = await getHomeworkTaskById(taskId);

  if (!task) throw new AppError('Homework task not found', 404);

  // Parent can only update tasks for their own children.
  // Verify by checking that the student belongs to the current parent user.
  const owned = await getStudentByIdAndParent(task.studentId, currentUser.id);
  if (!owned) throw new AppError('Forbidden', 403);

  return updateHomeworkTaskStatus(taskId, body.status as HomeworkTaskStatus);
}

// ── Private helpers ───────────────────────────────────────────────────────────

function emptyDashboard(
  selectedStudent: null,
  children: Array<{ id: string; fullName: string }>,
): ParentDashboardPayload {
  return {
    selected_student: null,
    children: children.map((c) => ({ id: c.id, first_name: c.fullName })),
    next_lesson: null,
    pending_confirmation: null,
    latest_lesson_update: null,
    recent_lessons: [],
    pending_booking_requests: [],
    quick_actions: { can_find_teacher: true },
    weekly_family_schedule: [],
  };
}

// Fetches the pending confirmation and resolves the lesson's subject_id in one step.
async function getPendingConfirmationWithLesson(studentId: string) {
  const confirmation = await getPendingConfirmation(studentId);
  if (!confirmation) return null;

  const subjectId = await getLessonSubjectId(confirmation.lessonId);
  return { confirmation, subjectId };
}

// Derives an aggregate task status from a list of homework tasks.
function computeTaskStatus(tasks: HomeworkTaskRow[]): HomeworkTaskStatus | null {
  if (tasks.length === 0) return null;
  if (tasks.every((t) => t.status === 'completed')) return 'completed';
  if (tasks.some((t) => t.status === 'in_progress')) return 'in_progress';
  return 'open';
}
