import { useState } from 'react';
import { CalendarClock, Clock, Download, ExternalLink, FileText, Image as ImageIcon, Link2, NotebookPen, Paperclip, Video } from 'lucide-react';

import { sbTokens as sb } from '../../../design/tokens';
import { useTeacherDashboardStore } from '../store/teacherDashboardStore';
import type { DashboardLesson, Material } from '../types/teacherDashboard.types';

const LESSON_STATUS_HE: Record<DashboardLesson['status'], string> = {
  scheduled: 'מתוכנן',
  completed: 'הושלם',
  cancelled: 'בוטל',
  no_show: 'לא הגיע',
};

const KIND_ICON: Record<Material['kind'], typeof FileText> = {
  pdf: FileText,
  doc: FileText,
  image: ImageIcon,
  link: Link2,
  other: Paperclip,
};

/**
 * Next Lesson Action Card — the primary "what's next" surface. All data comes
 * from the existing store (no new API): lesson fields + computed duration, the
 * student's attached files (store.materials), and the teacher's per-student
 * lesson note (studentNotes / setStudentNote).
 */
export function NextLessonActionCard({ lesson }: { lesson: DashboardLesson | null }) {
  const materials = useTeacherDashboardStore((s) => s.materials);
  const studentNotes = useTeacherDashboardStore((s) => s.studentNotes);
  const setStudentNote = useTeacherDashboardStore((s) => s.setStudentNote);

  const studentId = lesson?.studentId ?? '';
  const [note, setNote] = useState(studentId ? studentNotes[studentId] ?? '' : '');

  if (!lesson) {
    return (
      <div style={cardStyle}>
        <Header />
        <p style={{ margin: 0, fontSize: 13, color: sb.textMuted }}>אין שיעורים מתוכננים.</p>
      </div>
    );
  }

  const durationMin = Math.max(0, Math.round((new Date(lesson.endsAt).getTime() - new Date(lesson.startsAt).getTime()) / 60000));
  const files = materials.filter((m) => m.lessonId === lesson.id || (!!studentId && m.studentId === studentId));

  return (
    <div style={cardStyle}>
      <Header />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: sb.textPrimary }}>{lesson.studentName}</span>
          <StatusBadge status={lesson.status} />
        </div>
        <span style={{ fontSize: 14, color: sb.textSecondary }}>{lesson.subjectName ?? 'לא צוין'}</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 2 }}>
          <Meta icon={<CalendarClock size={14} />}>{new Date(lesson.startsAt).toLocaleString('he-IL', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</Meta>
          {durationMin > 0 && <Meta icon={<Clock size={14} />}>{durationMin} דק׳ (min)</Meta>}
        </div>

        {lesson.meetingLink ? (
          <a href={lesson.meetingLink} target="_blank" rel="noreferrer" style={joinBtn}>
            <Video size={16} /> הצטרפות לשיעור (Join Lesson)
          </a>
        ) : (
          <span style={{ ...joinBtn, color: sb.textMuted, borderColor: sb.borderCyber, cursor: 'default' }}>
            <Video size={16} /> אין קישור עדיין (No link yet)
          </span>
        )}
      </div>

      {/* Attached files */}
      <Section icon={<Paperclip size={14} />} he="קבצים מצורפים" en="Attached Files">
        {files.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12.5, color: sb.textMuted }}>לא צורפו קבצים לשיעור זה.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {files.map((f) => <FileRow key={f.id} file={f} />)}
          </div>
        )}
      </Section>

      {/* Lesson focus */}
      <Section icon={<NotebookPen size={14} />} he="נושא השיעור / מה ילמד?" en="Lesson Topic">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => studentId && setStudentNote(studentId, note.trim())}
          dir="rtl"
          rows={3}
          placeholder="לדוגמה: חזרה על אלגברה · הכנה למבחן במתמטיקה · תרגול חוקי ניוטון…"
          style={{
            width: '100%', padding: '10px 12px', borderRadius: sb.radiusSmall, background: sb.glassSoft,
            border: `1px solid ${sb.borderCyber}`, color: sb.textPrimary, fontSize: 13.5, lineHeight: 1.6,
            fontFamily: sb.fontUi, resize: 'vertical', outline: 'none',
          }}
        />
      </Section>
    </div>
  );
}

function Header() {
  return (
    <h2 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 800, color: sb.textPrimary, fontFamily: sb.fontUi }}>
      השיעור הבא <span style={{ color: sb.textMuted, fontWeight: 600, fontSize: 12 }}>(Next Lesson)</span>
    </h2>
  );
}

function FileRow({ file }: { file: Material }) {
  const Icon = KIND_ICON[file.kind];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: sb.radiusSmall, background: sb.glassSoft, border: `1px solid ${sb.borderCyber}` }}>
      <Icon size={16} style={{ color: sb.active, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: sb.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
        <span style={{ fontSize: 11, color: sb.textMuted, fontFamily: sb.fontMono }}>{fmtDate(file.createdAt)}</span>
      </div>
      {file.url ? (
        <a href={file.url} target="_blank" rel="noreferrer" aria-label="פתיחה (Open)" title="פתיחה / הורדה (Open)" style={fileActionStyle}>
          {file.kind === 'link' ? <ExternalLink size={15} /> : <Download size={15} />}
        </a>
      ) : (
        <span aria-disabled style={{ ...fileActionStyle, color: sb.textMuted, cursor: 'default', opacity: 0.5 }}>
          <Download size={15} />
        </span>
      )}
    </div>
  );
}

function Section({ icon, he, en, children }: { icon: React.ReactNode; he: string; en: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${sb.borderCyber}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: sb.textSecondary }}>
        {icon}
        <span style={{ fontSize: 12.5, fontWeight: 700 }}>{he} <span style={{ color: sb.textMuted, fontWeight: 600, fontSize: 11 }}>({en})</span></span>
      </div>
      {children}
    </div>
  );
}

function Meta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: sb.fontMono, fontSize: 12.5, color: sb.active }}>
      {icon}{children}
    </span>
  );
}

function StatusBadge({ status }: { status: DashboardLesson['status'] }) {
  const color = status === 'scheduled' ? sb.active : status === 'completed' ? sb.success : sb.textMuted;
  return <span style={{ color, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{LESSON_STATUS_HE[status]}</span>;
}

const cardStyle = { background: sb.glassBase, border: `1px solid ${sb.borderCyber}`, borderRadius: sb.radiusCard, padding: 18 } as const;

const joinBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '10px 18px',
  borderRadius: sb.radiusSmall, border: `1px solid ${sb.active}`, background: sb.hoverGlow, color: sb.active,
  fontSize: 14, fontWeight: 700, fontFamily: sb.fontUi, cursor: 'pointer', alignSelf: 'flex-start', textDecoration: 'none',
} as const;

const fileActionStyle = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, flexShrink: 0,
  borderRadius: sb.radiusSmall, border: `1px solid ${sb.borderCyber}`, background: 'transparent', color: sb.textSecondary, cursor: 'pointer',
} as const;

function fmtDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
