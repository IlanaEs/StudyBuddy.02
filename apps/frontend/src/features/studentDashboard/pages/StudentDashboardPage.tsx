import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, History, Settings } from 'lucide-react';

import { useAuth } from '../../../auth/AuthProvider';
import { towTokens as T } from '../../../design/tokens';
import { BentoGrid } from '../../teacher/components/BentoGrid';
import { useStudentDashboard } from '../hooks/useStudentDashboard';
import { StudentDashboardLayout } from '../components/StudentDashboardLayout';
import type { StudentView } from '../components/StudentSidebar';
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
        <p style={{ color: T.text3, fontSize: 14 }}>טוען את לוח הבקרה…</p>
      ) : error || !data ? (
        // Whole-payload failure (network/total). No raw backend error in the UI.
        <p style={{ color: T.alert, fontSize: 14 }}>לא הצלחנו לטעון את הקטע הזה כרגע</p>
      ) : view === 'settings' ? (
        <SettingsStub gradeLevel={data.student?.grade_level ?? null} studentName={studentName} />
      ) : view === 'overview' ? (
        <>
          {isEmptyOverview(data) && (
            <p style={{ color: T.text3, fontSize: 14, marginBottom: 14 }}>עדיין לא מולא שאלון</p>
          )}
          <BentoGrid className="bento-grid--student">
            <NextLessonTile lesson={data.next_lesson} />
            <MyTeachersTile
              teachers={data.my_teachers}
              onBook={(id, name) => setRebookTarget({ id, name })}
              onAllTeachers={() => setView('history')}
            />
            <BookingRequestsTile requests={data.booking_requests} />
            <RecentMaterialsTile materials={data.recent_materials} />
            <MonthlyActivityTile activity={data.monthly_activity} onFullHistory={() => setView('history')} />
            <FindTutorTile onFindTutor={goFindTutor} />
          </BentoGrid>
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
    <section
      style={{
        padding: 18,
        borderRadius: T.radius,
        border: `1px solid ${T.ink}`,
        background: 'color-mix(in oklab, #3f7e76 55%, transparent)',
        backdropFilter: 'blur(12px) saturate(140%)',
        WebkitBackdropFilter: 'blur(12px) saturate(140%)',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ color: T.neon, display: 'flex' }}><Settings size={18} /></span>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>
          פרופיל / הגדרות<span style={{ color: T.text3, fontWeight: 600 }}> (Profile / Settings)</span>
        </h2>
      </header>
      <div style={{ fontSize: 14, color: T.text2, lineHeight: 1.7 }}>
        <div>{studentName}</div>
        {gradeLevel && <div style={{ color: T.text3 }}>{gradeLevel}</div>}
      </div>
      <p style={{ marginTop: 14, marginBottom: 0, fontSize: 13.5, color: T.text3 }}>ההגדרות יהיו זמינות בקרוב</p>
    </section>
  );
}
