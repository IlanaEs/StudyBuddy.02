// Business logic only. No HTTP concerns. DB via the repository; storage via the
// storage helper. Access control is enforced HERE (the service role bypasses RLS).

import { randomUUID } from 'crypto';

import { AppError } from '../errors/AppError.js';
import type { LocalUser } from '../auth/authTypes.js';
import {
  MAX_DRAFTS_PER_STUDENT,
  MAX_FILES_PER_BOOKING,
  MAX_FILE_BYTES,
  resolveFileType,
  sanitizeFileName,
} from './attachments.constants.js';
import {
  carryAttachmentsToLesson as repoCarry,
  countDraftsByUser,
  countLinkedToBooking,
  deleteAttachment,
  getAttachmentById,
  getBookingRequestParties,
  getLessonParties,
  getStudentIdByUserId,
  getStudentOwner,
  getTeacherProfileIdByUserId,
  insertAttachment,
  linkDraftsToBooking,
  listByBooking,
  listByLesson,
} from './attachments.repository.js';
import { createSignedDownloadUrl, removeObject, uploadObject } from './attachments.storage.js';
import type { AttachmentMetadata, AttachmentRow, UploadedFile } from './attachments.types.js';
import { toMetadata } from './attachments.types.js';

// ── Upload a draft attachment (booking screen, before the booking exists) ─────
export async function uploadDraftAttachment(
  currentUser: LocalUser,
  file: UploadedFile,
): Promise<AttachmentMetadata> {
  const studentId = await getStudentIdByUserId(currentUser.id);
  if (!studentId) throw new AppError('פרופיל תלמיד לא נמצא.', 404);

  if (file.size > MAX_FILE_BYTES) {
    throw new AppError('הקובץ גדול מדי. ניתן לצרף קבצים עד 10MB.', 422);
  }

  // Trust the bytes, not the client's declared mimetype.
  const resolved = resolveFileType(file.buffer, file.mimeType, file.originalName);
  if (!resolved) {
    throw new AppError('סוג קובץ לא נתמך. ניתן לצרף PDF, תמונה (PNG/JPG) או מסמך Word.', 422);
  }

  const drafts = await countDraftsByUser(currentUser.id);
  if (drafts >= MAX_DRAFTS_PER_STUDENT) {
    throw new AppError('יש יותר מדי קבצים שלא שויכו. הסירו קבצים ונסו שוב.', 422);
  }

  const path = `${studentId}/${randomUUID()}.${resolved.ext}`;
  await uploadObject(path, file.buffer, resolved.mime);

  try {
    const row = await insertAttachment({
      uploadedByUserId: currentUser.id,
      studentId,
      storagePath: path,
      fileName: sanitizeFileName(file.originalName),
      fileType: resolved.mime,
      fileSizeBytes: file.size,
    });
    return toMetadata(row);
  } catch (err) {
    // Roll back the orphaned object if the metadata insert fails.
    await removeObject(path);
    throw err;
  }
}

// ── Link drafts to a booking the student owns (after createBookingRequest) ────
export async function linkAttachmentsToBooking(
  currentUser: LocalUser,
  bookingRequestId: string,
  attachmentIds: string[],
): Promise<{ linked: number }> {
  const parties = await getBookingRequestParties(bookingRequestId);
  if (!parties) throw new AppError('בקשת השיעור לא נמצאה.', 404);

  const owner = await getStudentOwner(parties.studentId);
  if (!owner || owner.userId !== currentUser.id) throw new AppError('Forbidden', 403);

  // Each id must be an unlinked draft owned by this student.
  for (const id of attachmentIds) {
    const row = await getAttachmentById(id);
    if (!row || row.uploadedByUserId !== currentUser.id || row.studentId !== parties.studentId || row.bookingRequestId) {
      throw new AppError('אחד הקבצים אינו זמין לצירוף.', 409);
    }
  }

  const existing = await countLinkedToBooking(bookingRequestId);
  if (existing + attachmentIds.length > MAX_FILES_PER_BOOKING) {
    throw new AppError('ניתן לצרף עד 5 קבצים לשיעור.', 422);
  }

  const linked = await linkDraftsToBooking(attachmentIds, bookingRequestId, currentUser.id);
  return { linked };
}

// ── List metadata for the authorized parties on a booking / lesson ────────────
export async function listAttachments(
  currentUser: LocalUser,
  scope: { bookingRequestId?: string; lessonId?: string },
): Promise<AttachmentMetadata[]> {
  if (scope.bookingRequestId) {
    const parties = await getBookingRequestParties(scope.bookingRequestId);
    if (!parties) return [];
    await assertParty(currentUser, parties);
    return (await listByBooking(scope.bookingRequestId)).map(toMetadata);
  }
  if (scope.lessonId) {
    const parties = await getLessonParties(scope.lessonId);
    if (!parties) return [];
    await assertParty(currentUser, parties);
    return (await listByLesson(scope.lessonId)).map(toMetadata);
  }
  throw new AppError('Bad request', 400);
}

// ── Short-lived signed download URL (after an access check) ───────────────────
export async function getAttachmentSignedUrl(currentUser: LocalUser, attachmentId: string): Promise<string> {
  const row = await getAttachmentById(attachmentId);
  if (!row) throw new AppError('הקובץ לא נמצא.', 404);
  await assertCanAccess(currentUser, row);
  return createSignedDownloadUrl(row.storagePath);
}

// ── Remove a draft before submit (uploader only, unlinked only) ───────────────
export async function deleteDraftAttachment(currentUser: LocalUser, attachmentId: string): Promise<void> {
  const row = await getAttachmentById(attachmentId);
  if (!row) throw new AppError('הקובץ לא נמצא.', 404);
  if (row.uploadedByUserId !== currentUser.id) throw new AppError('Forbidden', 403);
  if (row.bookingRequestId || row.lessonId) {
    throw new AppError('לא ניתן להסיר קובץ ששויך לבקשה.', 409);
  }
  await removeObject(row.storagePath);
  await deleteAttachment(attachmentId);
}

// ── Carry-on-approval (called from the booking approval flow) ─────────────────
export async function carryBookingAttachmentsToLesson(bookingRequestId: string, lessonId: string): Promise<void> {
  await repoCarry(bookingRequestId, lessonId);
}

// ── Access helpers ────────────────────────────────────────────────────────────

async function assertParty(currentUser: LocalUser, parties: { studentId: string; teacherId: string }): Promise<void> {
  if (currentUser.role === 'admin') return;
  const owner = await getStudentOwner(parties.studentId);
  if (owner && (owner.userId === currentUser.id || owner.parentUserId === currentUser.id)) return;
  const teacherProfileId = await getTeacherProfileIdByUserId(currentUser.id);
  if (teacherProfileId && teacherProfileId === parties.teacherId) return;
  throw new AppError('Forbidden', 403);
}

async function assertCanAccess(currentUser: LocalUser, row: AttachmentRow): Promise<void> {
  if (currentUser.role === 'admin') return;
  if (row.uploadedByUserId === currentUser.id) return;
  if (row.bookingRequestId) {
    const parties = await getBookingRequestParties(row.bookingRequestId);
    if (parties) {
      await assertParty(currentUser, parties);
      return;
    }
  }
  if (row.lessonId) {
    const parties = await getLessonParties(row.lessonId);
    if (parties) {
      await assertParty(currentUser, parties);
      return;
    }
  }
  throw new AppError('Forbidden', 403);
}
