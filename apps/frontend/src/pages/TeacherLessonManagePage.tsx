import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Check, ChevronDown, ChevronUp, Plus, Trash2, Clock } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { getTeacherLessons, completeLesson } from '../api/lessons';
import type { TeacherLessonItem } from '../api/lessons';

// ── Design tokens ──────────────────────────────────────────────────────────────

const SB_NEON = '#00f6ff';
const SB_SUCCESS = '#bbe341';
const SB_CORAL = '#fc6d17';
const SB_GOLD = '#f5c842';

const CARD_BASE: React.CSSProperties = {
  background: 'rgba(63, 126, 118, 0.55)',
  border: '1px solid #016c7c',
  borderRadius: 'var(--radius-lg)',
  backdropFilter: 'blur(12px) saturate(140%)',
  WebkitBackdropFilter: 'blur(12px) saturate(140%)',
  boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 18px 40px -24px rgba(0,0,0,0.72)',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const day = HEBREW_DAYS[d.getDay()] ?? '';
  const date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `יום ${day} ${date} — ${time}`;
}

function formatTimeOnly(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ── Completion form (inline, per lesson card) ─────────────────────────────────

function CompletionForm({
  lessonId,
  onSuccess,
  onCancel,
  accessToken,
}: {
  lessonId: string;
  onSuccess: () => void;
  onCancel: () => void;
  accessToken: string;
}) {
  const [summary, setSummary] = useState('');
  const [hwInputs, setHwInputs] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function addTask() {
    setHwInputs((prev) => [...prev, '']);
  }

  function removeTask(i: number) {
    setHwInputs((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateTask(i: number, val: string) {
    setHwInputs((prev) => prev.map((v, idx) => (idx === i ? val : v)));
  }

  async function handleSubmit() {
    if (!summary.trim()) {
      setError('יש להזין סיכום שיעור');
      return;
    }
    setError('');
    setSubmitting(true);

    const tasks = hwInputs.map((t) => t.trim()).filter(Boolean);

    const result = await completeLesson(
      lessonId,
      { summary: summary.trim(), homework_tasks: tasks },
      accessToken,
    );

    setSubmitting(false);

    if ('error' in result) {
      setError(result.error ?? 'שגיאה בסיום השיעור');
      return;
    }

    onSuccess();
  }

  return (
    <div
      style={{
        marginTop: 14,
        padding: '16px 18px',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(0,246,255,0.04)',
        border: '1px solid rgba(0,246,255,0.14)',
      }}
    >
      {/* Summary */}
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
        סיכום שיעור (יוצג להורה) *
      </label>
      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="מה עשינו היום בשיעור..."
        rows={3}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(220,245,240,0.15)',
          background: 'rgba(220,245,240,0.05)',
          color: 'var(--text)',
          fontSize: 13,
          lineHeight: 1.65,
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box',
          fontFamily: 'var(--font-body)',
        }}
      />

      {/* Homework tasks */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
          שיעורי בית (אופציונלי)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {hwInputs.map((val, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                value={val}
                onChange={(e) => updateTask(i, e.target.value)}
                placeholder={`משימה ${i + 1}...`}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(220,245,240,0.15)',
                  background: 'rgba(220,245,240,0.05)',
                  color: 'var(--text)',
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: 'var(--font-body)',
                }}
              />
              {hwInputs.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTask(i)}
                  style={{ background: 'none', border: 'none', color: SB_CORAL, cursor: 'pointer', padding: 4, display: 'flex' }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        {hwInputs.length < 10 && (
          <button
            type="button"
            onClick={addTask}
            style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: SB_NEON, cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: 0 }}
          >
            <Plus size={13} />
            הוסף משימה
          </button>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: SB_CORAL }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button
          type="button"
          disabled={submitting}
          onClick={() => void handleSubmit()}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: SB_SUCCESS,
            color: '#1a2a00',
            fontSize: 13,
            fontWeight: 800,
            fontFamily: 'var(--font-display)',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.65 : 1,
          }}
        >
          <Check size={14} />
          {submitting ? 'שומר...' : 'סיים שיעור'}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={onCancel}
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(220,245,240,0.15)',
            background: 'transparent',
            color: 'var(--text-3)',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ביטול
        </button>
      </div>
    </div>
  );
}

// ── Lesson card ────────────────────────────────────────────────────────────────

function LessonCard({
  lesson,
  accessToken,
  onCompleted,
}: {
  lesson: TeacherLessonItem;
  accessToken: string;
  onCompleted: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isScheduled = lesson.status === 'scheduled';

  const statusLabel =
    lesson.status === 'scheduled' ? 'מתוכנן'
    : lesson.status === 'completed' ? 'הושלם'
    : lesson.status === 'cancelled' ? 'בוטל'
    : 'לא התקיים';

  const statusColor =
    lesson.status === 'scheduled' ? SB_NEON
    : lesson.status === 'completed' ? SB_SUCCESS
    : SB_CORAL;

  return (
    <div style={{ ...CARD_BASE, padding: '18px 22px' }}>
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, justifyContent: 'space-between' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              {lesson.studentName}
            </span>
            {lesson.subjectName && (
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>
                · {lesson.subjectName}
              </span>
            )}
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                padding: '2px 8px',
                borderRadius: 999,
                background: `color-mix(in oklab, ${statusColor} 14%, transparent)`,
                border: `1px solid color-mix(in oklab, ${statusColor} 30%, transparent)`,
                color: statusColor,
                whiteSpace: 'nowrap',
              }}
            >
              {statusLabel}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
            <Clock size={12} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
              {formatDateTime(lesson.scheduledStartAt)}
              {' — '}
              {formatTimeOnly(lesson.scheduledEndAt)}
            </span>
          </div>
        </div>

        {isScheduled && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '7px 12px',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid color-mix(in oklab, ${SB_NEON} 30%, transparent)`,
              background: `color-mix(in oklab, ${SB_NEON} 8%, transparent)`,
              color: SB_NEON,
              fontSize: 12,
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              cursor: 'pointer',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'סגור' : 'סיים שיעור'}
          </button>
        )}
      </div>

      {/* Completion form */}
      {isScheduled && expanded && (
        <CompletionForm
          lessonId={lesson.id}
          accessToken={accessToken}
          onSuccess={() => onCompleted(lesson.id)}
          onCancel={() => setExpanded(false)}
        />
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

type PageState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'loaded'; lessons: TeacherLessonItem[] };

export function TeacherLessonManagePage() {
  const auth = useAuth();
  const [state, setState] = useState<PageState>({ phase: 'loading' });
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    const token = auth.session?.access_token;
    if (!token) return;

    void getTeacherLessons(token).then((result) => {
      if ('error' in result) {
        setState({ phase: 'error', message: result.error ?? 'שגיאה בטעינת השיעורים' });
      } else {
        setState({ phase: 'loaded', lessons: result.data.lessons });
      }
    });
  }, [auth.session?.access_token]);

  // When a lesson is completed, move it to the "completed" section locally.
  function handleCompleted(lessonId: string) {
    setState((prev) => {
      if (prev.phase !== 'loaded') return prev;
      return {
        phase: 'loaded',
        lessons: prev.lessons.map((l) =>
          l.id === lessonId ? { ...l, status: 'completed' as const } : l,
        ),
      };
    });
    showToast('השיעור הושלם! הסיכום וההתראה לניהול נשמרו.');
  }

  const scheduledLessons =
    state.phase === 'loaded' ? state.lessons.filter((l) => l.status === 'scheduled') : [];
  const recentLessons =
    state.phase === 'loaded' ? state.lessons.filter((l) => l.status !== 'scheduled') : [];

  return (
    <div
      dir="rtl"
      lang="he"
      style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 24px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--surface)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm)',
            background: `color-mix(in oklab, ${SB_NEON} 12%, transparent)`,
            border: `1.5px solid color-mix(in oklab, ${SB_NEON} 30%, transparent)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: SB_NEON,
          }}
        >
          <BookOpen size={16} />
        </span>
        <span
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: 'var(--text)',
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.02em',
          }}
        >
          StudyBuddy
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-3)',
            paddingRight: 8,
            borderRight: '1px solid var(--line)',
          }}
        >
          ניהול שיעורים
        </span>
        <nav style={{ marginRight: 'auto', display: 'flex', gap: 8 }}>
          <Link
            to="/teacher/inbox"
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-2)',
              textDecoration: 'none',
              padding: '5px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line)',
            }}
          >
            תיבת דואר
          </Link>
          <Link
            to="/teacher/lessons"
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: SB_NEON,
              textDecoration: 'none',
              padding: '5px 10px',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid color-mix(in oklab, ${SB_NEON} 30%, transparent)`,
              background: `color-mix(in oklab, ${SB_NEON} 8%, transparent)`,
            }}
          >
            שיעורים שלי
          </Link>
        </nav>
      </header>

      {/* Main */}
      <main
        style={{
          flex: 1,
          maxWidth: 720,
          width: '100%',
          margin: '0 auto',
          padding: '32px 20px 64px',
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        <div>
          <h1
            style={{
              margin: '0 0 4px',
              fontSize: 'clamp(20px, 4vw, 26px)',
              fontWeight: 900,
              color: 'var(--text)',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.025em',
            }}
          >
            שיעורים שלי
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-3)', fontWeight: 500 }}>
            סיים שיעורים ושלח סיכום להורה.
          </p>
        </div>

        {/* Loading */}
        {state.phase === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse"
                style={{ ...CARD_BASE, height: 90, opacity: 0.4 }}
              />
            ))}
          </div>
        )}

        {/* Error */}
        {state.phase === 'error' && (
          <div
            style={{
              ...CARD_BASE,
              padding: '20px 24px',
              color: SB_CORAL,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            שגיאה: {state.message}
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ marginRight: 12, background: 'none', border: 'none', color: SB_NEON, fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
            >
              נסה שוב
            </button>
          </div>
        )}

        {state.phase === 'loaded' && (
          <>
            {/* Scheduled lessons */}
            <section>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: SB_GOLD,
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 12,
                }}
              >
                ממתינים לסיום ({scheduledLessons.length})
              </div>
              {scheduledLessons.length === 0 ? (
                <div
                  style={{
                    ...CARD_BASE,
                    padding: '28px 24px',
                    textAlign: 'center',
                    color: 'var(--text-3)',
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  אין שיעורים מתוכננים.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {scheduledLessons.map((lesson) => (
                    <LessonCard
                      key={lesson.id}
                      lesson={lesson}
                      accessToken={auth.session?.access_token ?? ''}
                      onCompleted={handleCompleted}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Recently completed */}
            {recentLessons.length > 0 && (
              <section>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: SB_SUCCESS,
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 12,
                  }}
                >
                  הושלמו לאחרונה ({recentLessons.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recentLessons.map((lesson) => (
                    <LessonCard
                      key={lesson.id}
                      lesson={lesson}
                      accessToken={auth.session?.access_token ?? ''}
                      onCompleted={handleCompleted}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--surface)',
            border: `1px solid color-mix(in oklab, ${SB_SUCCESS} 30%, transparent)`,
            borderRadius: 'var(--radius-sm)',
            padding: '12px 20px',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text)',
            boxShadow: '0 8px 32px -8px rgba(0,0,0,0.6)',
            zIndex: 50,
            whiteSpace: 'nowrap',
            maxWidth: '90vw',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
