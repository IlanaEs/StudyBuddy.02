import { ArrowLeft, BookOpen, History, Users } from 'lucide-react';
import type { StudentDashboardTeacher } from '../data/mockStudentDashboard';
import { DashboardCard } from './DashboardCard';

type MyTeachersCardProps = {
  teachers: StudentDashboardTeacher[];
};

export function MyTeachersCard({ teachers }: MyTeachersCardProps) {
  return (
    <DashboardCard className="lg:col-start-2 lg:row-span-2 lg:row-start-2">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-950">המורים שלי</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">מורים שלמדת איתם ב-3 החודשים האחרונים</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-[#175655]">
          <Users size={24} aria-hidden="true" />
        </div>
      </div>

      {teachers.length > 0 ? (
        <div className="space-y-3">
          {teachers.map((teacher) => (
            <article
              className="grid grid-cols-[auto_1fr] gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center"
              key={teacher.id}
            >
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#175655] to-[#2f8b89] text-sm font-black text-white">
                {teacher.avatarUrl ? (
                  <img alt="" className="h-full w-full object-cover" src={teacher.avatarUrl} />
                ) : (
                  teacher.initials
                )}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-base font-black text-slate-950">{teacher.name}</h3>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-slate-500">
                  <BookOpen size={15} aria-hidden="true" />
                  {teacher.subject}
                </p>
              </div>
              <button className="col-span-2 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-[#175655] transition hover:border-cyan-200 hover:bg-cyan-50 sm:col-span-1">
                תיאום שיעור נוסף
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
          <p className="text-base font-black text-slate-800">עדיין אין מורים ברשימה שלך</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">אחרי שיעור ראשון, המורה יופיע כאן.</p>
        </div>
      )}

      <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 text-sm font-black text-slate-600 sm:grid-cols-2">
        <a className="inline-flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100" href="#">
          <span className="inline-flex min-w-0 items-center gap-2 whitespace-normal">
            <History size={16} aria-hidden="true" />
            היסטוריית שיעורים מלאה
          </span>
          <ArrowLeft size={16} aria-hidden="true" />
        </a>
        <a className="inline-flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100" href="#">
          <span className="inline-flex min-w-0 items-center gap-2 whitespace-normal">
            <Users size={16} aria-hidden="true" />
            מורים שלמדתי איתם בעבר
          </span>
          <ArrowLeft size={16} aria-hidden="true" />
        </a>
      </div>
    </DashboardCard>
  );
}
