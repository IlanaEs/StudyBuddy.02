// Sacred Naming: TypeScript camelCase; API payload fields stay snake_case.

export type UploadedFile = {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
};

// Internal row shape (camelCase) for a lesson_files record.
export type AttachmentRow = {
  id: string;
  uploadedByUserId: string;
  studentId: string | null;
  bookingRequestId: string | null;
  lessonId: string | null;
  storagePath: string; // stored in lesson_files.file_url
  fileName: string;
  fileType: string;
  fileSizeBytes: number | null;
};

// API metadata (snake_case) — never includes the storage path.
export type AttachmentMetadata = {
  id: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number | null;
};

export function toMetadata(row: AttachmentRow): AttachmentMetadata {
  return {
    id: row.id,
    file_name: row.fileName,
    file_type: row.fileType,
    file_size_bytes: row.fileSizeBytes,
  };
}
