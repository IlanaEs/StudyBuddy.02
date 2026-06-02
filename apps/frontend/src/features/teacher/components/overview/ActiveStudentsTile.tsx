import { useMemo, useState } from 'react';
import { Users, User } from 'lucide-react';
import { towTokens as T } from '../../../../design/tokens';
import { BentoTile } from '../BentoGrid';
import { EmptyState } from '../EmptyState';
import { useTeacherDashboardStore } from '../../store/teacherDashboardStore';

interface RecentStudent {
  studentId: string;
  name: string;
  subjectName: string | null;
  lastAt: number;
}

export function ActiveStudentsTile() {
  const lessons = useTeacherDashboardStore((s) => s.lessons);
  const setActiveTab = useTeacherDashboardStore((s) => s.setActiveTab);
  const [hovered, setHovered] = useState<string | null>(null);

  // Derive the 3 most-recent students from lessons (single source of truth).
  const recent = useMemo<RecentStudent[]>(() => {
    const byStudent = new Map<string, RecentStudent>();
    for (const l of lessons) {
      if (!l.studentId) continue;
      const at = new Date(l.startsAt).getTime();
      const existing = byStudent.get(l.studentId);
      if (!existing || at > existing.lastAt) {
        byStudent.set(l.studentId, { studentId: l.studentId, name: l.studentName, subjectName: l.subjectName, lastAt: at });
      }
    }
    return [...byStudent.values()].sort((a, b) => b.lastAt - a.lastAt).slice(0, 3);
  }, [lessons]);

  return (
    <BentoTile size="1x2" title="תלמידים פעילים" english="Active Students" icon={<Users size={16} />}>
      {recent.length === 0 ? (
        <EmptyState icon={<Users size={26} />} message="עדיין אין תלמידים פעילים." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {recent.map((s) => (
            <div
              key={s.studentId}
              onMouseEnter={() => setHovered(s.studentId)}
              onMouseLeave={() => setHovered((h) => (h === s.studentId ? null : h))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 8px',
                borderRadius: T.radiusSm,
                background: hovered === s.studentId ? 'color-mix(in oklab, #00f6ff 8%, transparent)' : 'transparent',
                transition: 'background 160ms ease',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 34, height: 34, flexShrink: 0, borderRadius: 999,
                  border: `1.5px solid ${T.neon}`, color: T.neon,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 800, fontFamily: T.fontMono,
                }}
              >
                {s.name.trim().charAt(0) || '?'}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                {s.subjectName && <span style={{ display: 'block', fontSize: 11.5, color: T.text3 }}>{s.subjectName}</span>}
              </span>
              <button
                type="button"
                aria-label={`לפרופיל של ${s.name}`}
                onClick={() => setActiveTab('students')}
                style={{
                  width: 28, height: 28, flexShrink: 0, borderRadius: 999,
                  border: `1px solid ${T.ink}`, background: 'color-mix(in oklab, #3f7e76 50%, transparent)',
                  color: T.text2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  opacity: hovered === s.studentId ? 1 : 0,
                  transform: hovered === s.studentId ? 'translateX(0)' : 'translateX(6px)',
                  transition: 'opacity 160ms ease, transform 160ms ease',
                }}
              >
                <User size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </BentoTile>
  );
}
