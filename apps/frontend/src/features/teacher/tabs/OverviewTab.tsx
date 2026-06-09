import { useMemo, type ReactNode } from 'react';
import { CalendarClock, Inbox, TrendingUp, Users, Wallet } from 'lucide-react';

import { sbTokens as sb } from '../../../design/tokens';
import { BentoCard, DashboardGrid } from '../../../design-system';
import { useTeacherDashboardStore } from '../store/teacherDashboardStore';
import { deriveStudentsFromLessons } from '../utils/deriveTables';

/** Overview — DS bento tiles derived from the shared store (lessons / requests / config). */
export function OverviewTab() {
  const lessons = useTeacherDashboardStore((s) => s.lessons);
  const requests = useTeacherDashboardStore((s) => s.requests);
  const hourlyRate = useTeacherDashboardStore((s) => s.config?.hourlyRate ?? null);

  const now = Date.now();
  const weekAhead = now + 7 * 24 * 60 * 60 * 1000;
  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }, []);

  const nextLesson = useMemo(
    () =>
      lessons
        .filter((l) => l.status === 'scheduled' && new Date(l.startsAt).getTime() >= now)
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null,
    [lessons, now],
  );

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const weekLessons = lessons.filter((l) => {
    const t = new Date(l.startsAt).getTime();
    return l.status === 'scheduled' && t >= now && t <= weekAhead;
  }).length;
  const activeStudents = useMemo(() => deriveStudentsFromLessons(lessons, now).filter((s) => s.status === 'active').length, [lessons, now]);
  const monthEarnings = useMemo(() => {
    if (hourlyRate == null) return 0;
    return lessons
      .filter((l) => l.status === 'completed' && new Date(l.startsAt).getTime() >= monthStart)
      .reduce((sum, l) => {
        const hours = (new Date(l.endsAt).getTime() - new Date(l.startsAt).getTime()) / 3_600_000;
        return sum + (hours > 0 ? Math.round(hourlyRate * hours) : 0);
      }, 0);
  }, [lessons, hourlyRate, monthStart]);

  return (
    <DashboardGrid>
      <BentoCard title="השיעור הבא" english="Next Lesson" icon={<CalendarClock size={16} />} colSpan={2}>
        {nextLesson ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontFamily: sb.fontMono, fontSize: 15, color: sb.active }}>
              {new Date(nextLesson.startsAt).toLocaleString('he-IL', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: sb.textPrimary }}>{nextLesson.studentName}</span>
            <span style={{ fontSize: 13, color: sb.textSecondary }}>{nextLesson.subjectName ?? 'לא צוין'}</span>
          </div>
        ) : (
          <span style={{ fontSize: 13, color: sb.textMuted }}>אין שיעורים מתוכננים.</span>
        )}
      </BentoCard>

      <StatTile icon={<Inbox size={16} />} titleHe="בקשות חדשות" titleEn="New Requests" value={pendingCount} accent={pendingCount > 0 ? sb.warning : undefined} />
      <StatTile icon={<CalendarClock size={16} />} titleHe="השבוע" titleEn="This Week" value={weekLessons} />
      <StatTile icon={<Users size={16} />} titleHe="תלמידים פעילים" titleEn="Active Students" value={activeStudents} />
      <BentoCard title="הכנסה החודש" english="Monthly Earnings" icon={<Wallet size={16} />}>
        <span style={{ fontFamily: sb.fontMono, fontSize: 30, fontWeight: 800, color: sb.textPrimary }}>₪{monthEarnings.toLocaleString('en-US')}</span>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11.5, color: sb.textMuted }}>
          <TrendingUp size={13} /> משיעורים שהושלמו
        </div>
      </BentoCard>
    </DashboardGrid>
  );
}

function StatTile({ icon, titleHe, titleEn, value, accent }: { icon: ReactNode; titleHe: string; titleEn: string; value: number; accent?: string }) {
  return (
    <BentoCard title={titleHe} english={titleEn} icon={icon}>
      <span style={{ fontFamily: sb.fontMono, fontSize: 34, fontWeight: 800, color: accent ?? sb.textPrimary }}>{value}</span>
    </BentoCard>
  );
}
