import { Bell, CalendarCheck } from 'lucide-react';
import { DashboardCard } from '../../../components/layout/DashboardCard';
import type { BookingRequest } from '../types/teacherDashboard.types';

type Props = { requests: BookingRequest[] };

export function NewBookingRequestsCard({ requests }: Props) {
  const count = requests.length;

  return (
    <DashboardCard className="flex flex-col gap-5 lg:col-start-3 lg:row-start-1">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950">בקשות חדשות</h2>
          {count > 0 ? (
            <p className="mt-1 text-sm font-semibold text-slate-600">
              יש לך <span className="font-black text-[#175655]">{count}</span> בקשות חדשות הממתינות לאישור ביומן.
            </p>
          ) : (
            <p className="mt-1 text-sm font-semibold text-slate-500">אין בקשות חדשות כרגע. הבוט עובד על זה!</p>
          )}
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <Bell size={22} aria-hidden="true" />
        </div>
      </div>

      {count > 0 && (
        <ul className="flex flex-col gap-3">
          {requests.map((req) => (
            <li
              key={req.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-slate-900 truncate">{req.studentName}</p>
                <p className="text-xs font-semibold text-slate-500">{req.subject} · {req.requestedSlotLabel}</p>
              </div>
              <CalendarCheck size={16} className="shrink-0 text-[#175655]" aria-hidden="true" />
            </li>
          ))}
        </ul>
      )}

      <button
        className="mt-auto inline-flex w-full items-center justify-center rounded-2xl border border-[#175655]/20 bg-[#175655]/5 px-4 py-3 text-sm font-black text-[#175655] transition hover:bg-[#175655]/10"
        type="button"
      >
        לצפייה בבקשות וניהול הלו״ז
      </button>
    </DashboardCard>
  );
}
