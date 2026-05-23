import { Trophy } from 'lucide-react';
import { DashboardCard } from './DashboardCard';

type StatsCardProps = {
  monthlyStudyHours: number;
};

export function StatsCard({ monthlyStudyHours }: StatsCardProps) {
  return (
    <DashboardCard className="lg:col-start-3 lg:row-start-2">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-50 text-[#9a7300]">
        <Trophy size={25} aria-hidden="true" />
      </div>
      <h2 className="text-xl font-black text-slate-950">ההתקדמות שלך השבוע</h2>
      <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
        החודש למדת כבר <span className="font-black text-[#175655]">{monthlyStudyHours}</span> שעות ב-StudyBuddy. כל
        הכבוד, להמשיך ככה!
      </p>
    </DashboardCard>
  );
}
