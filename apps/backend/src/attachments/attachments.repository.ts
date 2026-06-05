// DB access only. No business logic. No validation.

import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import type { AttachmentRow } from './attachments.types.js';

const adminClient = createSupabaseAdminClient;

const COLUMNS =
  'id,uploaded_by_user_id,student_id,booking_request_id,lesson_id,file_url,file_name,file_type,file_size_bytes';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): AttachmentRow {
  return {
    id: row.id as string,
    uploadedByUserId: row.uploaded_by_user_id as string,
    studentId: row.student_id as string | null,
    bookingRequestId: row.booking_request_id as string | null,
    lessonId: row.lesson_id as string | null,
    storagePath: row.file_url as string,
    fileName: row.file_name as string,
    fileType: row.file_type as string,
    fileSizeBytes: (row.file_size_bytes as number | null) ?? null,
  };
}

// ── Party resolvers (for access control) ──────────────────────────────────────

export async function getStudentIdByUserId(userId: string): Promise<string | null> {
  const { data, error } = await adminClient()
    .from('students')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new AppError('Failed to load student profile', 500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any)?.id as string | null) ?? null;
}

export async function getStudentOwner(
  studentId: string,
): Promise<{ userId: string | null; parentUserId: string | null } | null> {
  const { data, error } = await adminClient()
    .from('students')
    .select('user_id,parent_user_id')
    .eq('id', studentId)
    .maybeSingle();
  if (error) throw new AppError('Failed to load student', 500);
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return { userId: (row.user_id as string | null) ?? null, parentUserId: (row.parent_user_id as string | null) ?? null };
}

export async function getTeacherProfileIdByUserId(userId: string): Promise<string | null> {
  const { data, error } = await adminClient()
    .from('teacher_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new AppError('Failed to load teacher profile', 500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any)?.id as string | null) ?? null;
}

export async function getBookingRequestParties(
  bookingRequestId: string,
): Promise<{ studentId: string; teacherId: string } | null> {
  const { data, error } = await adminClient()
    .from('booking_requests')
    .select('student_id,teacher_id')
    .eq('id', bookingRequestId)
    .maybeSingle();
  if (error) throw new AppError('Failed to load booking request', 500);
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return { studentId: row.student_id as string, teacherId: row.teacher_id as string };
}

export async function getLessonParties(
  lessonId: string,
): Promise<{ studentId: string; teacherId: string } | null> {
  const { data, error } = await adminClient()
    .from('lessons')
    .select('student_id,teacher_id')
    .eq('id', lessonId)
    .maybeSingle();
  if (error) throw new AppError('Failed to load lesson', 500);
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return { studentId: row.student_id as string, teacherId: row.teacher_id as string };
}

// ── Attachment rows ───────────────────────────────────────────────────────────

export async function insertAttachment(input: {
  uploadedByUserId: string;
  studentId: string;
  storagePath: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
}): Promise<AttachmentRow> {
  const { data, error } = await adminClient()
    .from('lesson_files')
    .insert({
      uploaded_by_user_id: input.uploadedByUserId,
      student_id: input.studentId,
      file_url: input.storagePath,
      file_name: input.fileName,
      file_type: input.fileType,
      file_size_bytes: input.fileSizeBytes,
    })
    .select(COLUMNS)
    .single();
  if (error || !data) throw new AppError('שגיאה ברישום הקובץ. נסו שוב.', 500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapRow(data as any);
}

export async function getAttachmentById(id: string): Promise<AttachmentRow | null> {
  const { data, error } = await adminClient().from('lesson_files').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new AppError('Failed to load attachment', 500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data ? mapRow(data as any) : null;
}

export async function countDraftsByUser(userId: string): Promise<number> {
  const { data, error } = await adminClient()
    .from('lesson_files')
    .select('id')
    .eq('uploaded_by_user_id', userId)
    .is('booking_request_id', null)
    .is('lesson_id', null);
  if (error) throw new AppError('Failed to count drafts', 500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).length;
}

export async function countLinkedToBooking(bookingRequestId: string): Promise<number> {
  const { data, error } = await adminClient()
    .from('lesson_files')
    .select('id')
    .eq('booking_request_id', bookingRequestId);
  if (error) throw new AppError('Failed to count attachments', 500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).length;
}

export async function listByBooking(bookingRequestId: string): Promise<AttachmentRow[]> {
  const { data, error } = await adminClient()
    .from('lesson_files')
    .select(COLUMNS)
    .eq('booking_request_id', bookingRequestId)
    .order('created_at', { ascending: true });
  if (error) throw new AppError('Failed to load attachments', 500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).map(mapRow);
}

export async function listByLesson(lessonId: string): Promise<AttachmentRow[]> {
  const { data, error } = await adminClient()
    .from('lesson_files')
    .select(COLUMNS)
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: true });
  if (error) throw new AppError('Failed to load attachments', 500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).map(mapRow);
}

// Links draft rows (owned by the user, not yet attached) to a booking request.
export async function linkDraftsToBooking(
  ids: string[],
  bookingRequestId: string,
  uploadedByUserId: string,
): Promise<number> {
  const { data, error } = await adminClient()
    .from('lesson_files')
    .update({ booking_request_id: bookingRequestId })
    .in('id', ids)
    .eq('uploaded_by_user_id', uploadedByUserId)
    .is('booking_request_id', null)
    .select('id');
  if (error) throw new AppError('שגיאה בצירוף הקבצים לבקשה.', 500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).length;
}

export async function deleteAttachment(id: string): Promise<void> {
  const { error } = await adminClient().from('lesson_files').delete().eq('id', id);
  if (error) throw new AppError('שגיאה בהסרת הקובץ.', 500);
}

// Carries a booking's attachments onto the created lesson (called on approval).
export async function carryAttachmentsToLesson(bookingRequestId: string, lessonId: string): Promise<void> {
  const { error } = await adminClient()
    .from('lesson_files')
    .update({ lesson_id: lessonId })
    .eq('booking_request_id', bookingRequestId);
  if (error) throw new AppError('Failed to carry attachments to lesson', 500);
}
