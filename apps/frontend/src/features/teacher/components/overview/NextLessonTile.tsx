import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, FileText, BookCheck, Check, Video } from 'lucide-react';
import { towTokens as T } from '../../../../design/tokens';
import { BentoTile } from '../BentoGrid';
import { EmptyState } from '../EmptyState';
import { useTeacherDashboardStore } from '../../store/teacherDashboardStore';

const TEN_MIN_MS = 10 * 60 * 1000;

function pad(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type InnerTab = 'materials' | 'homework';

export function NextLessonTile() {
  const lessons = useTeacherDashboardStore((s) => s.lessons);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [inner, setInner] = useState<InnerTab>('materials');

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const next = useMemo(() => {
    return lessons
      .filter((l) => l.status === 'scheduled' && new Date(l.startsAt).getTime() >= nowMs - TEN_MIN_MS)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
    // Recompute as time passes so a finished lesson rolls off.
  }, [lessons, nowMs]);

  const diffMs = next ? new Date(next.startsAt).getTime() - nowMs : 0;
  const enterable = !!next && diffMs <= TEN_MIN_MS; // 10 min before → enterable
  const countdown = (() => {
    if (!next) return '';
    const s = Math.max(0, Math.floor(diffMs / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${pad(h)}:${pad(m)}:${pad(sec)}`;
  })();

  return (
    <BentoTile size="2x2" title="השיעור הקרוב" english="Next Lesson" icon={<CalendarClock size={16} />}>
      {!next ? (
        <EmptyState icon={<CalendarClock size={26} />} message="אין שיעור קרוב מתוכנן." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, flex: 1 }}>
          {/* Right column (RTL first): details + countdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{next.studentName}</div>
            <div style={{ fontSize: 13, color: T.text2 }}>{next.subjectName ?? 'שיעור'}</div>
            <div style={{ fontSize: 13, color: T.text2, fontFamily: T.fontMono }}>{formatTime(next.startsAt)}</div>
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 11, color: T.text3 }}>בעוד</div>
              <div style={{ fontFamily: T.fontMono, fontSize: 26, fontWeight: 800, color: enterable ? T.neon : T.text, lineHeight: 1.1 }}>
                {countdown}
              </div>
            </div>
            <button
              type="button"
              className={enterable ? 'tow-pulse-cta' : undefined}
              style={{
                marginTop: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: T.radiusSm,
                border: `1.5px solid ${enterable ? T.neon : T.ink}`,
                background: enterable ? 'color-mix(in oklab, #00f6ff 18%, transparent)' : 'color-mix(in oklab, #016c7c 35%, transparent)',
                color: enterable ? T.neon : T.text2,
                fontSize: 13.5,
                fontWeight: 800,
                cursor: enterable ? 'pointer' : 'default',
                transition: 'background 200ms ease, border-color 200ms ease, color 200ms ease',
              }}
            >
              <Video size={15} />
              כניסה לשיעור (Enter Lesson)
            </button>
          </div>

          {/* Left column: inner Materials / Homework tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderInlineStart: `1px solid ${T.ink}`, paddingInlineStart: 12 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <InnerTabButton active={inner === 'materials'} onClick={() => setInner('materials')} icon={<FileText size={13} />} label="חומרים" english="Materials" />
              <InnerTabButton active={inner === 'homework'} onClick={() => setInner('homework')} icon={<BookCheck size={13} />} label="שיעורי בית" english="Homework" />
            </div>
            {inner === 'materials' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, borderRadius: T.radiusSm, border: `1px dashed ${T.ink}` }}>
                <FileText size={18} style={{ color: T.gold, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: T.text3 }}>אין חומרים מצורפים לשיעור זה.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, borderRadius: T.radiusSm, border: `1px dashed ${T.ink}` }}>
                <Check size={16} style={{ color: T.text3, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: T.text3 }}>אין שיעורי בית פתוחים.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </BentoTile>
  );
}

function InnerTabButton({
  active,
  onClick,
  icon,
  label,
  english,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  english: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 9px',
        borderRadius: 999,
        border: `1px solid ${active ? T.neon : T.ink}`,
        background: active ? 'color-mix(in oklab, #00f6ff 12%, transparent)' : 'transparent',
        color: active ? T.neon : T.text3,
        fontSize: 11.5,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {icon}
      {label} ({english})
    </button>
  );
}
