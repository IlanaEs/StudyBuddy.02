import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, History } from 'lucide-react';

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

export function StudentDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useStudentDashboard();

  const [view, setView] = useState<StudentView>('overview');
  const [rebookTarget, setRebookTarget] = useState<{ id: string; name: string } | null>(null);

  const studentName = data?.student?.first_name ?? user?.full_name ?? 'תלמיד';
  const goFindTutor = () => navigate('/onboarding/matching');

  return (
    <StudentDashboardLayout studentName={studentName} activeView={view} onSelectView={setView}>
      {loading ? (
        <p style={{ color: T.text3, fontSize: 14 }}>טוען את לוח הבקרה…</p>
      ) : error || !data ? (
        <p style={{ color: T.alert, fontSize: 14 }}>אירעה שגיאה בטעינת הנתונים. רענן את העמוד ונסה שוב.</p>
      ) : view === 'overview' ? (
        <BentoGrid>
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
      ) : view === 'lessons' ? (
        <LessonsListView
          title="השיעורים שלי"
          english="My Lessons"
          icon={<CalendarClock size={18} />}
          emptyMessage="אין שיעורים מתוכננים"
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
          emptyMessage="אין שיעורים קודמים"
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
