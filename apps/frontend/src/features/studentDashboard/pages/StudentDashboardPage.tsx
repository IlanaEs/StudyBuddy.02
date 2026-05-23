import { useEffect } from 'react';

import { MainCtaCard } from '../components/MainCtaCard';
import { MyTeachersCard } from '../components/MyTeachersCard';
import { NextLessonCard } from '../components/NextLessonCard';
import { StatsCard } from '../components/StatsCard';
import { TemporaryChatCard } from '../components/TemporaryChatCard';
import { mockStudentDashboard } from '../data/mockStudentDashboard';

export function StudentDashboardPage() {
  const dashboard = mockStudentDashboard;

  useEffect(() => {
    const previousDocumentDirection = document.documentElement.dir;
    const previousDocumentLanguage = document.documentElement.lang;

    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'he';

    return () => {
      document.documentElement.dir = previousDocumentDirection;
      document.documentElement.lang = previousDocumentLanguage;
    };
  }, []);

  return (
    <main
      className="min-h-screen overflow-x-hidden bg-[#f4f6f8] px-4 py-6 text-slate-950 sm:px-6 lg:px-8 lg:py-10"
      dir="rtl"
      lang="he"
    >
      <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6">
        <header className="flex w-full max-w-full min-w-0 flex-col gap-2 rounded-[2rem] border border-white/80 bg-white/70 px-5 py-5 shadow-[0_20px_60px_-40px_rgba(15,69,68,0.3)] backdrop-blur md:px-7">
          <p className="text-sm font-black text-[#175655]">StudyBuddy</p>
          <h1 className="max-w-3xl text-2xl font-black leading-tight text-slate-950 md:text-4xl">
            היי {dashboard.student.firstName}, איזה כיף לראות אותך. מה לומדים היום?
          </h1>
        </header>

        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.82fr)_minmax(260px,0.72fr)] lg:items-stretch">
          <NextLessonCard lesson={dashboard.lesson} />
          <MainCtaCard />
          <MyTeachersCard teachers={dashboard.teachers} />
          <TemporaryChatCard chat={dashboard.chat} />
          <StatsCard monthlyStudyHours={dashboard.monthlyStudyHours} />
        </div>
      </div>
    </main>
  );
}
