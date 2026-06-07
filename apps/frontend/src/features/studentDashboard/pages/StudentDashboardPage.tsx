import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, History, Settings } from 'lucide-react';

import { useAuth } from '../../../auth/AuthProvider';
import { BentoCard, DashboardGrid, GlobalStateCard, sbTokens as sb } from '../../../design-system';
import { useStudentDashboard } from '../hooks/useStudentDashboard';
import { StudentDashboardLayout } from '../components/StudentDashboardLayout';
import type { StudentView } from '../types';
import { NextLessonTile } from '../components/NextLessonTile';
import { MyTeachersTile } from '../components/MyTeachersTile';
import { BookingRequestsTile } from '../components/BookingRequestsTile';
import { RecentMaterialsTile } from '../components/RecentMaterialsTile';
import { MonthlyActivityTile } from '../components/MonthlyActivityTile';
import { FindTutorTile } from '../components/FindTutorTile';
import { LessonsListView } from '../components/LessonsListView';
import { RebookModal } from '../components/RebookModal';
import type { StudentDashboardPayload } from '../api/types';

export function StudentDashboardPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useStudentDashboard();

  const [view, setView] = useState<StudentView>('overview');
  const [rebookTarget, setRebookTarget] = useState<{ id: string; name: string } | null>(null);

  const studentName = data?.student?.first_name ?? auth.user?.full_name ?? 'תלמיד';
  const goFindTutor = () => navigate('/find-tutor');

  const handleSignOut = async () => {
    try {
      await auth.logout();
    } finally {
      navigate('/', { replace: true });
    }
  };

  return (
    <StudentDashboardLayout
      studentName={studentName}
      activeView={view}
      onSelectView={setView}
      onSignOut={() => void handleSignOut()}
    >
      {loading ? (
        // Per-tile loading: keep the exact grid shape, each cell shows a spinner.
        <DashboardSkeleton />
      ) : error || !data ? (
        // Whole-payload failure (network/total). One retryable state; no raw backend error.
        <GlobalStateCard
          variant="error"
          fullPage
          title="לא הצלחנו לטעון את לוח הבקרה"
          description="אירעה שגיאה בטעינת הנתונים. נסו שוב."
          cta={{ label: 'נסה שוב', onClick: () => void refetch() }}
        />
      ) : view === 'settings' ? (
        <SettingsStub gradeLevel={data.student?.grade_level ?? null} studentName={studentName} />
      ) : view === 'overview' ? (
        <>
          {isEmptyOverview(data) && (
            <p style={{ color: sb.textMuted, fontSize: 14, marginBottom: 14 }}>עדיין לא מולא שאלון</p>
          )}
          {/* DOM order = row-major fill of the 3-column priority grid (RTL):
              row1 = col1 NextLesson · col2 MyTeachers · col3 FindTutor;
              row2 = col1 BookingRequests · col2 RecentMaterials · col3 MonthlyActivity.
              Mobile re-sequences to urgency order via .bento-grid--student (styles.css). */}
          <DashboardGrid className="bento-grid bento-grid--student">
            <NextLessonTile lesson={data.next_lesson} />
            <MyTeachersTile
              teachers={data.my_teachers}
              onBook={(id, name) => setRebookTarget({ id, name })}
              onAllTeachers={() => setView('history')}
            />
            <FindTutorTile onFindTutor={goFindTutor} />
            <BookingRequestsTile requests={data.booking_requests} />
            <RecentMaterialsTile materials={data.recent_materials} />
            <MonthlyActivityTile activity={data.monthly_activity} onFullHistory={() => setView('history')} />
          </DashboardGrid>
        </>
      ) : view === 'lessons' ? (
        <LessonsListView
          title="השיעורים שלי"
          english="My Lessons"
          icon={<CalendarClock size={18} />}
          emptyMessage="אין שיעורים עדיין"
          items={data.upcoming_lessons.map((l) => ({
            id: l.id,
            when: l.starts_at,
            subjectName: l.subject_name,
            teacherName: l.teacher_name,
          }))}
        />
      ) : (
        <LessonsListView
          title="היסטוריה וסיכומים"
          english="History & Notes"
          icon={<History size={18} />}
          emptyMessage="אין שיעורים עדיין"
          items={data.recent_lessons.map((l) => ({
            id: l.id,
            when: l.date,
            subjectName: l.subject_name,
            teacherName: l.teacher_name,
          }))}
        />
      )}

      {rebookTarget && (
        <RebookModal
          teacherId={rebookTarget.id}
          teacherName={rebookTarget.name}
          onClose={() => setRebookTarget(null)}
          onBooked={refetch}
        />
      )}
    </StudentDashboardLayout>
  );
}

// Mirrors the overview grid spans so the skeleton keeps the exact 3-column shape.
const SKELETON_TILES: Array<{ colSpan: number; rowSpan: number }> = [
  { colSpan: 2, rowSpan: 2 }, // NextLesson
  { colSpan: 2, rowSpan: 2 }, // MyTeachers
  { colSpan: 1, rowSpan: 2 }, // FindTutor
  { colSpan: 1, rowSpan: 2 }, // BookingRequests
  { colSpan: 1, rowSpan: 2 }, // RecentMaterials
  { colSpan: 1, rowSpan: 2 }, // MonthlyActivity
];

function DashboardSkeleton() {
  return (
    <DashboardGrid className="bento-grid bento-grid--student">
      {SKELETON_TILES.map((t, i) => (
        <BentoCard
          key={i}
          colSpan={t.colSpan}
          rowSpan={t.rowSpan}
          hover={false}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 140 }}
        >
          <GlobalStateCard variant="loading" title="טוען…" />
        </BentoCard>
      ))}
    </DashboardGrid>
  );
}

function isEmptyOverview(data: StudentDashboardPayload): boolean {
  return (
    !data.next_lesson &&
    data.my_teachers.length === 0 &&
    data.booking_requests.length === 0 &&
    data.upcoming_lessons.length === 0 &&
    data.recent_lessons.length === 0 &&
    !data.recent_materials
  );
}

function SettingsStub({ studentName, gradeLevel }: { studentName: string; gradeLevel: string | null }) {
  return (
    <BentoCard title="פרופיל / הגדרות" english="Profile / Settings" icon={<Settings size={18} />} hover={false}>
      <div style={{ fontSize: 14, color: sb.textSecondary, lineHeight: 1.7 }}>
        <div>{studentName}</div>
        {gradeLevel && <div style={{ color: sb.textMuted }}>{gradeLevel}</div>}
      </div>
      <p style={{ marginTop: 14, marginBottom: 0, fontSize: 13.5, color: sb.textMuted }}>ההגדרות יהיו זמינות בקרוב</p>
    </BentoCard>
  );
}
