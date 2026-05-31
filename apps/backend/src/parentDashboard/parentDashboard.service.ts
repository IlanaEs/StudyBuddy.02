// Business logic only. No DB access. No HTTP concerns.

import { AppError } from '../errors/AppError.js';
import type { LocalUser } from '../auth/authTypes.js';
import type { HomeworkTaskRow, HomeworkTaskStatus, ParentDashboardPayload } from './parentDashboard.types.js';
import type { UpdateHomeworkTaskBody } from './parentDashboard.validation.js';
import {
  approveLessonConfirmation,
  batchGetSubjectNamesByIds,
  batchGetTeacherNamesByProfileIds,
  batchGetUserNamesByIds,
  getChildrenByParentUserId,
  getConfirmationStatusesByLessonIds,
  getHomeworkTaskById,
  getHomeworkTasksByLessonNoteId,
  getLessonConfirmationById,
  getLessonSubjectId,
  getLatestLessonNote,
  getPendingConfirmation,
  getNextLesson,
  getRecentLessons,
  getStudentByIdAndParent,
  updateHomeworkTaskStatus,
} from './parentDashboard.repository.js';

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
  const [nextLessonRaw, pendingConfirmationRaw, latestNoteRaw, recentLessonsRaw] =
    await Promise.all([
      getNextLesson(selectedStudentId),
      getPendingConfirmationWithLesson(selectedStudentId),
      getLatestLessonNote(selectedStudentId),
      getRecentLessons(selectedStudentId, 3),
    ]);

  // ── Homework tasks for the latest note ────────────────────────────────────
  const homeworkTasks = latestNoteRaw
    ? await getHomeworkTasksByLessonNoteId(latestNoteRaw.id)
    : [];

  // ── Batch-resolve names ────────────────────────────────────────────────────
  // Collect all teacher profile IDs (from lessons)
  const teacherProfileIds = [
    ...(nextLessonRaw ? [nextLessonRaw.teacherProfileId] : []),
    ...recentLessonsRaw.map((l) => l.teacherProfileId),
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
  ];
  const subjectNames = await batchGetSubjectNamesByIds(subjectIds);

  // ── Confirmation statuses for recent lessons ──────────────────────────────
  const recentLessonIds = recentLessonsRaw.map((l) => l.id);
  const confirmationStatuses = await getConfirmationStatusesByLessonIds(recentLessonIds);

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

    quick_actions: {
      can_find_teacher: true,
    },
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
    quick_actions: { can_find_teacher: true },
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
