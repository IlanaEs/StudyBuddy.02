import { useEffect } from 'react';
import { AnimatedContainer } from '../../../components/animations/AnimatedContainer';
import { DashboardPageShell } from '../../../components/layout/DashboardPageShell';
import { CalendarPreviewCard } from '../components/CalendarPreviewCard';
import { NewBookingRequestsCard } from '../components/NewBookingRequestsCard';
import { NextLessonHeroCard } from '../components/NextLessonHeroCard';
import { RecentStudentsCard } from '../components/RecentStudentsCard';
import { WalletSummaryCard } from '../components/WalletSummaryCard';
import { mockTeacherDashboard } from '../data/mockTeacherDashboard';

export function TeacherDashboardPage() {
  const dashboard = mockTeacherDashboard;

  useEffect(() => {
    const prevDir = document.documentElement.dir;
    const prevLang = document.documentElement.lang;
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'he';
    return () => {
      document.documentElement.dir = prevDir;
      document.documentElement.lang = prevLang;
    };
  }, []);

  return (
    <DashboardPageShell
      greeting={`היי ${dashboard.teacher.firstName}, ברוכה הבאה לדשבורד שלך`}
    >
      <AnimatedContainer className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-3 lg:items-start">
        <NextLessonHeroCard lesson={dashboard.nextLesson} />
        <NewBookingRequestsCard requests={dashboard.bookingRequests} />
        <CalendarPreviewCard scheduledLessons={dashboard.scheduledLessons} />
        <RecentStudentsCard students={dashboard.recentStudents} />
        <WalletSummaryCard wallet={dashboard.wallet} />
      </AnimatedContainer>
    </DashboardPageShell>
  );
}
