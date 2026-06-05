import { useEffect, useState } from 'react';
import { Paperclip, Download, Loader2 } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { listAttachments, getAttachmentSignedUrl, type AttachmentMeta } from '../api/attachments';

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Read-only attachments list with signed-URL download. Used on the teacher's
 * booking request (by bookingRequestId) and lesson (by lessonId). Renders nothing
 * when there are no files. Styled with the legacy CSS-var theme to match those pages.
 */
export function AttachmentList({
  bookingRequestId,
  lessonId,
}: {
  bookingRequestId?: string;
  lessonId?: string;
}) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const [items, setItems] = useState<AttachmentMeta[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    listAttachments(token, { bookingRequestId, lessonId }).then((res) => {
      if (!('error' in res)) setItems(res.data.attachments);
    });
  }, [token, bookingRequestId, lessonId]);

  async function download(id: string) {
    if (!token) return;
    setBusyId(id);
    const res = await getAttachmentSignedUrl(token, id);
    setBusyId(null);
    if (!('error' in res)) window.open(res.data.url, '_blank', 'noopener,noreferrer');
  }

  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--text-3)',
          marginBottom: 6,
        }}
      >
        <Paperclip size={13} />
        קבצים מצורפים (Attachments)
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((a) => (
          <li
            key={a.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-2)',
              border: '1px solid var(--line-2)',
            }}
          >
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {a.file_name}
            </span>
            {a.file_size_bytes ? (
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{formatSize(a.file_size_bytes)}</span>
            ) : null}
            <button
              type="button"
              onClick={() => void download(a.id)}
              disabled={busyId === a.id}
              aria-label="הורדת קובץ"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--line-2)',
                background: 'transparent',
                color: 'var(--text-2)',
                cursor: busyId === a.id ? 'wait' : 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {busyId === a.id ? <Loader2 size={13} className="tow-spin" /> : <Download size={13} />}
              הורדה
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
