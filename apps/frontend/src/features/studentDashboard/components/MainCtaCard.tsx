import { Search, UserPlus } from 'lucide-react';
import { DashboardCard } from './DashboardCard';

export function MainCtaCard() {
  return (
    <DashboardCard className="!bg-[#175655] text-white lg:col-start-3 lg:row-start-1">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-studybuddy-turquoise">
        <UserPlus size={25} aria-hidden="true" />
      </div>
      <h2 className="text-xl font-black leading-tight">צריך עזרה במקצוע נוסף?</h2>
      <p className="mt-3 text-sm font-semibold leading-6 text-white/72">
        הבוט שלנו כאן כדי למצוא לך את המורה המדויק לצרכים שלך.
      </p>
      <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-studybuddy-turquoise px-4 py-3 text-sm font-black text-[#073635] shadow-lg shadow-cyan-950/20 transition hover:-translate-y-0.5">
        <Search size={17} aria-hidden="true" />
        מצא לי מורה חדש
      </button>
    </DashboardCard>
  );
}
