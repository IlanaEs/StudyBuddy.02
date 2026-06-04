import { useCallback, useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { X, CalendarPlus } from 'lucide-react';
import { towTokens as T } from '../../../design/tokens';
import { useAuth } from '../../../auth/AuthProvider';
import { getTeacherAvailableSlots } from '../api/getTeacherAvailableSlots';
import { createRebookRequest } from '../api/createRebookRequest';
import { formatTime } from './formatters';
import type { AvailableSlot } from '../api/types';

function tomorrowISODate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function RebookModal({
  teacherId,
  teacherName,
  onClose,
  onBooked,
}: {
  teacherId: string;
  teacherName: string;
  onClose: () => void;
  onBooked: () => void;
}) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;

  const [date, setDate] = useState<string>(tomorrowISODate);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AvailableSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadSlots = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setSelected(null);
    const res = await getTeacherAvailableSlots(token, teacherId, date, 60);
    if ('error' in res) {
      setSlots([]);
    } else {
      setSlots(res.data.available_slots);
    }
    setLoading(false);
  }, [token, teacherId, date]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const submit = async () => {
    if (!token || !selected) return;
    setSubmitting(true);
    const res = await createRebookRequest(token, {
      teacher_id: teacherId,
      requested_start_at: selected.start_at,
      requested_end_at: selected.end_at,
    });
    setSubmitting(false);

    if ('error' in res) {
      notifications.show({ title: 'שגיאה', message: 'לא הצלחנו לשלוח את הבקשה. נסה שוב.', color: 'red' });
      return;
    }
    notifications.show({ title: 'הבקשה נשלחה', message: 'הבקשה נשלחה למורה לאישור.', color: 'green' });
    onBooked();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="הזמנת שיעור נוסף"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(4, 22, 21, 0.66)',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        dir="rtl"
        className="tow"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(440px, 100%)',
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: 22,
          borderRadius: T.radius,
          border: `1px solid ${T.ink}`,
          background: T.bg,
          color: T.text,
          boxShadow: '0 24px 70px -28px rgba(0,0,0,0.8)',
        }}
      >
        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
              הזמן שיעור נוסף<span style={{ color: T.text3, fontWeight: 600 }}> (Book Lesson)</span>
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13.5, color: T.text2 }}>עם {teacherName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            style={{ background: 'none', border: 'none', color: T.text3, cursor: 'pointer', padding: 4 }}
          >
            <X size={20} />
          </button>
        </header>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: T.text2, marginBottom: 6 }}>
          בחר תאריך
        </label>
        <input
          type="date"
          value={date}
          min={tomorrowISODate()}
          onChange={(e) => setDate(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: T.radiusSm,
            border: `1px solid ${T.ink}`,
            background: 'color-mix(in oklab, #3f7e76 35%, transparent)',
            color: T.text,
            fontSize: 14,
            marginBottom: 16,
          }}
        />

        <div style={{ fontSize: 13, fontWeight: 700, color: T.text2, marginBottom: 8 }}>שעות פנויות</div>

        {loading ? (
          <p style={{ fontSize: 13, color: T.text3 }}>טוען זמינות…</p>
        ) : slots.length === 0 ? (
          <p style={{ fontSize: 13, color: T.text3 }}>אין שעות פנויות בתאריך זה</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {slots.map((s) => {
              const isSel = selected?.start_at === s.start_at;
              return (
                <button
                  key={s.start_at}
                  type="button"
                  onClick={() => setSelected(s)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: T.radiusSm,
                    border: `1.5px solid ${isSel ? T.neon : T.ink}`,
                    background: isSel ? 'color-mix(in oklab, #00f6ff 16%, transparent)' : 'transparent',
                    color: isSel ? T.neon : T.text,
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: T.fontMono,
                    cursor: 'pointer',
                    transition: 'border-color 250ms ease-out, color 250ms ease-out',
                  }}
                >
                  {formatTime(s.start_at)}
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={!selected || submitting}
          style={{
            marginTop: 20,
            width: '100%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '12px 16px',
            borderRadius: T.radiusSm,
            border: 'none',
            background: !selected || submitting ? 'color-mix(in oklab, #00f6ff 22%, transparent)' : T.neon,
            color: '#04201f',
            fontSize: 14,
            fontWeight: 800,
            cursor: !selected || submitting ? 'not-allowed' : 'pointer',
            opacity: !selected || submitting ? 0.6 : 1,
          }}
        >
          <CalendarPlus size={16} />
          {submitting ? 'שולח…' : 'שלח בקשה'}
        </button>
      </div>
    </div>
  );
}
