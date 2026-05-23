import { Calendar, Clock, Video } from 'lucide-react';
import type { StudentDashboardLesson } from '../data/mockStudentDashboard';
import { DashboardCard } from './DashboardCard';

type NextLessonCardProps = {
  lesson: StudentDashboardLesson;
};

export function NextLessonCard({ lesson }: NextLessonCardProps) {
  const hasLesson = lesson.state !== 'none';
  const isActive = lesson.state === 'active';

  return (
    <DashboardCard className="relative min-h-[300px] overflow-hidden bg-gradient-to-br from-white via-white to-cyan-50/80 p-6 md:p-7 lg:col-span-2 lg:col-start-1 lg:row-start-1">
      <div className="absolute -left-20 -top-24 h-56 w-56 rounded-full bg-studybuddy-turquoise/20 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-studybuddy-yellow/20 blur-3xl" />

      <div className="relative flex h-full flex-col justify-between gap-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-sm font-bold text-[#0f6866]">
              <Calendar size={16} aria-hidden="true" />
              {hasLesson ? lesson.startsAtLabel : 'אין שיעור מתוכנן'}
            </div>
            <h2 className="text-2xl font-black leading-tight text-slate-950 md:text-4xl">השיעור הקרוב שלך</h2>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#175655] text-studybuddy-turquoise shadow-lg shadow-cyan-950/10">
            <Video size={28} aria-hidden="true" />
          </div>
        </div>

        {hasLesson ? (
          <div className="space-y-5">
            <div className="min-w-0">
              <p className="text-lg font-extrabold text-slate-900 md:text-2xl">{lesson.subject}</p>
              <p className="mt-2 text-base font-semibold text-slate-600">עם {lesson.teacherName}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-bold text-slate-600">
              <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2">
                <Clock size={16} aria-hidden="true" />
                {lesson.durationLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2">
                <Calendar size={16} aria-hidden="true" />
                {lesson.startsAtLabel}
              </span>
            </div>
          </div>
        ) : (
          <p className="max-w-xl text-lg font-bold leading-8 text-slate-700">
            אין לך שיעורים קרובים כרגע. צריך תגבור במשהו?
          </p>
        )}

        {lesson.state === 'none' ? (
          <button className="inline-flex w-full items-center justify-center rounded-2xl bg-[#175655] px-5 py-4 text-base font-black text-white shadow-lg shadow-teal-950/15 transition hover:-translate-y-0.5 hover:bg-[#114746] md:w-fit">
            בוא נתאם שיעור
          </button>
        ) : isActive ? (
          <a
            className="inline-flex w-full items-center justify-center rounded-2xl bg-[#175655] px-5 py-4 text-base font-black text-white shadow-lg shadow-teal-950/15 transition hover:-translate-y-0.5 hover:bg-[#114746] md:w-fit"
            href={lesson.meetingUrl}
          >
            כניסה לשיעור
          </a>
        ) : (
          <button
            className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-2xl bg-slate-200 px-5 py-4 text-base font-black text-slate-500 md:w-fit"
            disabled
            type="button"
          >
            הלינק יפתח 10 דקות לפני השיעור
          </button>
        )}
      </div>
    </DashboardCard>
  );
}
