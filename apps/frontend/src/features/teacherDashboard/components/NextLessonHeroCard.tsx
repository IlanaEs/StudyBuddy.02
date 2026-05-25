import { Calendar, Clock, FileText, Video } from 'lucide-react';
import { DashboardCard } from '../../../components/layout/DashboardCard';
import type { TeacherNextLesson } from '../types/teacherDashboard.types';

type Props = { lesson: TeacherNextLesson };

export function NextLessonHeroCard({ lesson }: Props) {
  return (
    <DashboardCard className="relative min-h-[320px] overflow-hidden bg-gradient-to-br from-white via-white to-cyan-50/80 p-6 md:p-7 lg:col-span-2 lg:col-start-1 lg:row-start-1">
      <div className="absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[#0f6866]/15 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-yellow-300/20 blur-3xl" />

      <div className="relative flex h-full flex-col justify-between gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-sm font-bold text-[#0f6866]">
              <Calendar size={16} aria-hidden="true" />
              {lesson.state !== 'none' ? lesson.startsAtLabel : 'לו״ז פנוי'}
            </div>
            <h2 className="text-2xl font-black leading-tight text-slate-950 md:text-3xl">השיעור הקרוב שלך</h2>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#175655] text-[#4dd9d5] shadow-lg shadow-cyan-950/10">
            <Video size={28} aria-hidden="true" />
          </div>
        </div>

        {lesson.state !== 'none' ? (
          <div className="space-y-4">
            <div className="min-w-0">
              <p className="text-lg font-extrabold text-slate-900 md:text-2xl">{lesson.subject}</p>
              <p className="mt-1 text-base font-semibold text-slate-600">עם {lesson.studentName}</p>
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

            {lesson.smartBrief && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                  <FileText size={13} aria-hidden="true" />
                  סיכום חכם
                </div>
                {lesson.smartBrief.uploadedMaterial && (
                  <p className="text-sm font-semibold text-slate-700">
                    <span className="font-bold text-slate-400">חומר שהועלה: </span>
                    {lesson.smartBrief.uploadedMaterial}
                  </p>
                )}
                {lesson.smartBrief.previousLessonSummary && (
                  <p className="text-sm font-semibold text-slate-700">
                    <span className="font-bold text-slate-400">שיעור קודם: </span>
                    {lesson.smartBrief.previousLessonSummary}
                  </p>
                )}
                {lesson.smartBrief.homeworkStatus && (
                  <p className="text-sm font-semibold text-slate-700">
                    <span className="font-bold text-slate-400">שיעורי בית: </span>
                    {lesson.smartBrief.homeworkStatus}
                  </p>
                )}
              </div>
            )}

            {lesson.state === 'active' ? (
              <a
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[#175655] px-5 py-4 text-base font-black text-white shadow-lg shadow-teal-950/15 transition hover:-translate-y-0.5 hover:bg-[#114746] md:w-fit"
                href={lesson.meetingUrl}
              >
                כניסה לשיעור 🚀
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
        ) : (
          <div className="space-y-2">
            <p className="text-xl font-black text-slate-900">הלו״ז שלך פנוי להיום</p>
            <p className="max-w-sm text-sm font-semibold leading-7 text-slate-600">
              זה הזמן להשלים פערים, לבדוק משימות או לעדכן זמינות ביומן.
            </p>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
