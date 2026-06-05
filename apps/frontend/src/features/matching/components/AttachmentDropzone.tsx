import { useId, useRef, useState } from 'react';
import { Paperclip, X, Check, Loader2, FileText, AlertCircle } from 'lucide-react';
import { towTokens as T } from '../../../design/tokens';
import { useAuth } from '../../../auth/AuthProvider';
import { uploadAttachment, deleteAttachment } from '../../../api/attachments';

const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT = ['pdf', 'png', 'jpg', 'jpeg', 'docx'];

type Item = {
  localId: string;
  name: string;
  status: 'uploading' | 'done' | 'error';
  progress: number;
  attachmentId?: string;
  error?: string;
};

let counter = 0;
const nextId = () => `f${++counter}`;

export function AttachmentDropzone({ onChange }: { onChange: (attachmentIds: string[]) => void }) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const emit = (next: Item[]) =>
    onChange(next.filter((i) => i.status === 'done' && i.attachmentId).map((i) => i.attachmentId!));

  const patch = (localId: string, p: Partial<Item>) =>
    setItems((prev) => {
      const next = prev.map((i) => (i.localId === localId ? { ...i, ...p } : i));
      emit(next);
      return next;
    });

  async function addFiles(files: FileList | File[]) {
    if (!token) return;
    const incoming = Array.from(files);

    for (const file of incoming) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      const item: Item = { localId: nextId(), name: file.name, status: 'uploading', progress: 0 };

      // Client-side pre-checks (server is authoritative).
      if (items.length + 1 > MAX_FILES) {
        setItems((prev) => [...prev, { ...item, status: 'error', error: 'ניתן לצרף עד 5 קבצים' }]);
        continue;
      }
      if (!ALLOWED_EXT.includes(ext)) {
        setItems((prev) => [...prev, { ...item, status: 'error', error: 'סוג קובץ לא נתמך' }]);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setItems((prev) => [...prev, { ...item, status: 'error', error: 'הקובץ גדול מדי (עד 10MB)' }]);
        continue;
      }

      setItems((prev) => [...prev, item]);
      try {
        const meta = await uploadAttachment(file, token, (pct) => patch(item.localId, { progress: pct }));
        patch(item.localId, { status: 'done', progress: 100, attachmentId: meta.id });
      } catch (err) {
        patch(item.localId, { status: 'error', error: err instanceof Error ? err.message : 'שגיאה בהעלאה' });
      }
    }
  }

  async function remove(item: Item) {
    if (item.attachmentId && token) {
      await deleteAttachment(token, item.attachmentId); // best-effort
    }
    setItems((prev) => {
      const next = prev.filter((i) => i.localId !== item.localId);
      emit(next);
      return next;
    });
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void addFiles(e.dataTransfer.files);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '18px 14px',
          borderRadius: T.radiusSm,
          border: `1.5px dashed ${dragOver ? T.neon : T.line2}`,
          background: dragOver ? 'color-mix(in oklab, #00f6ff 10%, transparent)' : 'color-mix(in oklab, #3f7e76 22%, transparent)',
          color: T.text2,
          cursor: 'pointer',
          textAlign: 'center',
          transition: 'border-color 250ms ease-out, background 250ms ease-out',
        }}
      >
        <Paperclip size={16} />
        <span style={{ fontSize: 13 }}>גררו קבצים לכאן או לחצו לבחירה — PDF, תמונה או Word, עד 10MB</span>
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.docx"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {items.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((item) => (
            <li
              key={item.localId}
              className={item.status === 'uploading' ? 'tow-ants' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: T.radiusSm,
                border: `1px solid ${item.status === 'error' ? T.alert : T.line}`,
                background: 'color-mix(in oklab, #3f7e76 28%, transparent)',
              }}
            >
              <span style={{ display: 'flex', color: T.text3 }}><FileText size={15} /></span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.name}
              </span>

              {item.status === 'uploading' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.neon, fontSize: 12, fontFamily: T.fontMono }}>
                  <Loader2 size={14} className="tow-spin" />
                  {item.progress}%
                </span>
              )}
              {item.status === 'done' && (
                <span style={{ display: 'flex', color: T.success }}><Check size={16} /></span>
              )}
              {item.status === 'error' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: T.alert, fontSize: 12 }}>
                  <AlertCircle size={14} />
                  {item.error}
                </span>
              )}

              <button
                type="button"
                onClick={() => void remove(item)}
                aria-label="הסר קובץ"
                style={{ display: 'flex', background: 'none', border: 'none', color: T.text3, cursor: 'pointer', padding: 2 }}
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
