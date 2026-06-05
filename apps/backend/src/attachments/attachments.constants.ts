// Lesson attachments — shared limits + server-side type detection (magic-number
// based; the client's declared mimetype is NOT trusted). Keep the bucket name in
// sync with scripts/setup-storage.mjs.

export const ATTACHMENTS_BUCKET = 'lesson-attachments';
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_FILES_PER_BOOKING = 5;
export const MAX_DRAFTS_PER_STUDENT = 12; // abuse cap on unlinked uploads
export const SIGNED_URL_TTL_SECONDS = 60;

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export type ResolvedFileType = { mime: string; ext: string };

function startsWith(buf: Buffer, bytes: number[]): boolean {
  if (buf.length < bytes.length) return false;
  return bytes.every((b, i) => buf[i] === b);
}

/**
 * Resolves the real file type from the raw bytes (magic numbers), independent of
 * the client-declared mimetype. PDF/PNG/JPEG have unique signatures. DOCX is a
 * ZIP container, so we accept the ZIP signature only when the declared mimetype
 * (or .docx extension) indicates a Word document. Returns null for anything else.
 */
export function resolveFileType(
  buffer: Buffer,
  declaredMime: string,
  originalName: string,
): ResolvedFileType | null {
  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46])) return { mime: 'application/pdf', ext: 'pdf' }; // %PDF
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: 'image/png', ext: 'png' };
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return { mime: 'image/jpeg', ext: 'jpg' };

  // ZIP container — only DOCX is allowed, gated by declared type / extension.
  if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04])) {
    const looksDocx = declaredMime === DOCX_MIME || originalName.toLowerCase().endsWith('.docx');
    if (looksDocx) return { mime: DOCX_MIME, ext: 'docx' };
  }
  return null;
}

// Bounded, safe display name: keep only letters, digits, spaces, dot, dash,
// underscore, parentheses, and Hebrew letters; collapse everything else.
export function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? 'file';
  const cleaned = base.replace(/[^\p{L}\p{N}._\-() ]/gu, '').trim();
  return (cleaned || 'file').slice(0, 200);
}
