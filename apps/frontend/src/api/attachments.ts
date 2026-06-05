import { apiRequest } from './client';
import type { ApiResponse } from './client';

export type AttachmentMeta = {
  id: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number | null;
};

const API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

// Multipart upload with progress (fetch lacks upload progress → XHR). Returns the
// created attachment metadata. The file streams to the backend, which validates
// type/size server-side and stores it in the private bucket.
export function uploadAttachment(
  file: File,
  accessToken: string,
  onProgress?: (pct: number) => void,
): Promise<AttachmentMeta> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API}/api/attachments`);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }

    xhr.onload = () => {
      let body: { data?: { attachment: AttachmentMeta }; error?: string } | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && body?.data?.attachment) {
        resolve(body.data.attachment);
      } else {
        reject(new Error(body?.error ?? 'שגיאה בהעלאת הקובץ'));
      }
    };
    xhr.onerror = () => reject(new Error('שגיאת תקשורת בהעלאה'));
    xhr.send(form);
  });
}

export function linkAttachments(
  accessToken: string,
  bookingRequestId: string,
  attachmentIds: string[],
): Promise<ApiResponse<{ linked: number }>> {
  return apiRequest(
    '/api/attachments/link',
    { method: 'POST', body: JSON.stringify({ booking_request_id: bookingRequestId, attachment_ids: attachmentIds }) },
    accessToken,
  );
}

export function deleteAttachment(accessToken: string, id: string): Promise<ApiResponse<{ deleted: true }>> {
  return apiRequest(`/api/attachments/${id}`, { method: 'DELETE' }, accessToken);
}

export function listAttachments(
  accessToken: string,
  scope: { bookingRequestId?: string; lessonId?: string },
): Promise<ApiResponse<{ attachments: AttachmentMeta[] }>> {
  const qs = scope.bookingRequestId
    ? `?booking_request_id=${encodeURIComponent(scope.bookingRequestId)}`
    : `?lesson_id=${encodeURIComponent(scope.lessonId ?? '')}`;
  return apiRequest(`/api/attachments${qs}`, undefined, accessToken);
}

export function getAttachmentSignedUrl(accessToken: string, id: string): Promise<ApiResponse<{ url: string }>> {
  return apiRequest(`/api/attachments/${id}/signed-url`, undefined, accessToken);
}
