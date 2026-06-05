import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Module mocks (hoisted before imports) ─────────────────────────────────────

vi.mock('../src/attachments/attachments.repository.js', () => ({
  getStudentIdByUserId: vi.fn(),
  getStudentOwner: vi.fn(),
  getTeacherProfileIdByUserId: vi.fn(),
  getBookingRequestParties: vi.fn(),
  getLessonParties: vi.fn(),
  insertAttachment: vi.fn(),
  getAttachmentById: vi.fn(),
  countDraftsByUser: vi.fn(),
  countLinkedToBooking: vi.fn(),
  listByBooking: vi.fn(),
  listByLesson: vi.fn(),
  linkDraftsToBooking: vi.fn(),
  deleteAttachment: vi.fn(),
  carryAttachmentsToLesson: vi.fn(),
}));

vi.mock('../src/attachments/attachments.storage.js', () => ({
  uploadObject: vi.fn(),
  createSignedDownloadUrl: vi.fn(),
  removeObject: vi.fn(),
}));

import {
  getAttachmentSignedUrl,
  linkAttachmentsToBooking,
  uploadDraftAttachment,
} from '../src/attachments/attachments.service.js';
import {
  countDraftsByUser,
  countLinkedToBooking,
  getAttachmentById,
  getBookingRequestParties,
  getStudentIdByUserId,
  getStudentOwner,
  getTeacherProfileIdByUserId,
  insertAttachment,
  linkDraftsToBooking,
} from '../src/attachments/attachments.repository.js';
import { createSignedDownloadUrl, uploadObject } from '../src/attachments/attachments.storage.js';
import type { LocalUser } from '../src/auth/authTypes.js';
import type { AttachmentRow } from '../src/attachments/attachments.types.js';

const student: LocalUser = {
  id: 'user-1',
  supabase_auth_user_id: 'auth-1',
  email: 's@example.com',
  role: 'student',
  full_name: 'דנה',
  status: 'active',
};

const PDF = Buffer.concat([Buffer.from([0x25, 0x50, 0x44, 0x46]), Buffer.from('-1.4 rest')]); // %PDF
const TEXT = Buffer.from('just some plain text, not a real file');

function row(overrides: Partial<AttachmentRow> = {}): AttachmentRow {
  return {
    id: 'att-1',
    uploadedByUserId: 'user-1',
    studentId: 'stu-1',
    bookingRequestId: null,
    lessonId: null,
    storagePath: 'stu-1/abc.pdf',
    fileName: 'file.pdf',
    fileType: 'application/pdf',
    fileSizeBytes: 1234,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('uploadDraftAttachment', () => {
  it('404s when the user has no student profile', async () => {
    vi.mocked(getStudentIdByUserId).mockResolvedValue(null);
    await expect(uploadDraftAttachment(student, file(PDF, 100))).rejects.toMatchObject({ statusCode: 404 });
  });

  it('422s an oversized file (Hebrew message)', async () => {
    vi.mocked(getStudentIdByUserId).mockResolvedValue('stu-1');
    await expect(uploadDraftAttachment(student, file(PDF, 11 * 1024 * 1024))).rejects.toMatchObject({ statusCode: 422 });
    expect(uploadObject).not.toHaveBeenCalled();
  });

  it('422s a file whose bytes are not an allowed type (magic-number check)', async () => {
    vi.mocked(getStudentIdByUserId).mockResolvedValue('stu-1');
    await expect(uploadDraftAttachment(student, file(TEXT, 100))).rejects.toMatchObject({ statusCode: 422 });
    expect(uploadObject).not.toHaveBeenCalled();
  });

  it('422s when the draft cap is exceeded', async () => {
    vi.mocked(getStudentIdByUserId).mockResolvedValue('stu-1');
    vi.mocked(countDraftsByUser).mockResolvedValue(12);
    await expect(uploadDraftAttachment(student, file(PDF, 100))).rejects.toMatchObject({ statusCode: 422 });
  });

  it('uploads + records a valid PDF and returns metadata only', async () => {
    vi.mocked(getStudentIdByUserId).mockResolvedValue('stu-1');
    vi.mocked(countDraftsByUser).mockResolvedValue(0);
    vi.mocked(uploadObject).mockResolvedValue(undefined);
    vi.mocked(insertAttachment).mockResolvedValue(row({ fileName: 'exercise.pdf' }));

    const meta = await uploadDraftAttachment(student, file(PDF, 100, 'exercise.pdf'));

    expect(uploadObject).toHaveBeenCalledTimes(1);
    expect(meta).toEqual({ id: 'att-1', file_name: 'exercise.pdf', file_type: 'application/pdf', file_size_bytes: 1234 });
    // Never leak the storage path.
    expect(meta).not.toHaveProperty('storage_path');
  });
});

describe('linkAttachmentsToBooking', () => {
  it('403s when the student does not own the booking', async () => {
    vi.mocked(getBookingRequestParties).mockResolvedValue({ studentId: 'stu-1', teacherId: 'tp-1' });
    vi.mocked(getStudentOwner).mockResolvedValue({ userId: 'someone-else', parentUserId: null });
    await expect(linkAttachmentsToBooking(student, 'br-1', ['att-1'])).rejects.toMatchObject({ statusCode: 403 });
  });

  it('422s when it would exceed 5 files per booking', async () => {
    vi.mocked(getBookingRequestParties).mockResolvedValue({ studentId: 'stu-1', teacherId: 'tp-1' });
    vi.mocked(getStudentOwner).mockResolvedValue({ userId: 'user-1', parentUserId: null });
    vi.mocked(getAttachmentById).mockResolvedValue(row());
    vi.mocked(countLinkedToBooking).mockResolvedValue(4);
    await expect(linkAttachmentsToBooking(student, 'br-1', ['att-1', 'att-2'])).rejects.toMatchObject({ statusCode: 422 });
  });

  it('links owned drafts to the booking', async () => {
    vi.mocked(getBookingRequestParties).mockResolvedValue({ studentId: 'stu-1', teacherId: 'tp-1' });
    vi.mocked(getStudentOwner).mockResolvedValue({ userId: 'user-1', parentUserId: null });
    vi.mocked(getAttachmentById).mockResolvedValue(row());
    vi.mocked(countLinkedToBooking).mockResolvedValue(0);
    vi.mocked(linkDraftsToBooking).mockResolvedValue(1);

    const res = await linkAttachmentsToBooking(student, 'br-1', ['att-1']);
    expect(res).toEqual({ linked: 1 });
  });
});

describe('getAttachmentSignedUrl (access control)', () => {
  it('allows the uploading student', async () => {
    vi.mocked(getAttachmentById).mockResolvedValue(row({ uploadedByUserId: 'user-1', bookingRequestId: 'br-1' }));
    vi.mocked(createSignedDownloadUrl).mockResolvedValue('https://signed/url');
    await expect(getAttachmentSignedUrl(student, 'att-1')).resolves.toBe('https://signed/url');
  });

  it('allows the teacher on the booking', async () => {
    const teacher: LocalUser = { ...student, id: 'tu-9', role: 'teacher' };
    vi.mocked(getAttachmentById).mockResolvedValue(row({ uploadedByUserId: 'someone', bookingRequestId: 'br-1' }));
    vi.mocked(getBookingRequestParties).mockResolvedValue({ studentId: 'stu-1', teacherId: 'tp-1' });
    vi.mocked(getStudentOwner).mockResolvedValue({ userId: 'stu-user', parentUserId: null });
    vi.mocked(getTeacherProfileIdByUserId).mockResolvedValue('tp-1');
    vi.mocked(createSignedDownloadUrl).mockResolvedValue('https://signed/url');
    await expect(getAttachmentSignedUrl(teacher, 'att-1')).resolves.toBe('https://signed/url');
  });

  it('403s an unrelated user', async () => {
    const stranger: LocalUser = { ...student, id: 'nope', role: 'teacher' };
    vi.mocked(getAttachmentById).mockResolvedValue(row({ uploadedByUserId: 'someone', bookingRequestId: 'br-1' }));
    vi.mocked(getBookingRequestParties).mockResolvedValue({ studentId: 'stu-1', teacherId: 'tp-1' });
    vi.mocked(getStudentOwner).mockResolvedValue({ userId: 'stu-user', parentUserId: null });
    vi.mocked(getTeacherProfileIdByUserId).mockResolvedValue('tp-other');
    await expect(getAttachmentSignedUrl(stranger, 'att-1')).rejects.toMatchObject({ statusCode: 403 });
    expect(createSignedDownloadUrl).not.toHaveBeenCalled();
  });
});

function file(buffer: Buffer, size: number, originalName = 'file.pdf') {
  return { buffer, originalName, mimeType: 'application/pdf', size };
}
