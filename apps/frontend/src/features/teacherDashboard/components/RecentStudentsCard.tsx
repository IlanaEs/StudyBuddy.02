import { Users } from 'lucide-react';
import { DashboardCard } from '../../studentDashboard/components/DashboardCard';
import type { RecentStudent } from '../types/teacherDashboard.types';

type Props = { students: RecentStudent[] };

export function RecentStudentsCard({ students }: Props) {
  return (
    <DashboardCard className="flex flex-col gap-5 lg:col-start-2 lg:row-start-2">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <Users size={18} aria-hidden="true" />
        </div>
        <h2 className="text-xl font-black text-slate-950">תלמידים אחרונים</h2>
      </div>

      {students.length === 0 ? (
        <p className="text-sm font-semibold text-slate-500">עדיין אין תלמידים משובצים. בוא נתחיל!</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {students.slice(0, 3).map((student) => (
            <li
              key={student.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#175655] text-sm font-black text-[#4dd9d5]">
                {student.avatarInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-slate-900 truncate">{student.name}</p>
                <p className="text-xs font-semibold text-slate-500">{student.subject}</p>
                {student.nextLessonLabel && (
                  <p className="text-xs font-semibold text-[#0f6866]">הבא: {student.nextLessonLabel}</p>
                )}
                {!student.nextLessonLabel && student.lastLessonLabel && (
                  <p className="text-xs font-semibold text-slate-400">אחרון: {student.lastLessonLabel}</p>
                )}
              </div>
              <button
                className="shrink-0 rounded-xl border border-[#175655]/20 px-3 py-1.5 text-xs font-black text-[#175655] transition hover:bg-[#175655]/10"
                type="button"
              >
                פרופיל מלא
              </button>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
