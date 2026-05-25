import { Wallet } from 'lucide-react';
import { DashboardCard } from '../../../components/layout/DashboardCard';
import type { WalletSummary } from '../types/teacherDashboard.types';

type Props = { wallet: WalletSummary };

export function WalletSummaryCard({ wallet }: Props) {
  return (
    <DashboardCard className="flex flex-col gap-4 lg:col-start-3 lg:row-start-2">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-600">
          <Wallet size={18} aria-hidden="true" />
        </div>
        <h2 className="text-xl font-black text-slate-950">החודש בארנק</h2>
      </div>

      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">הכנסה צפויה החודש</p>
          <p className="text-2xl font-black text-[#175655]">
            ₪{wallet.expectedMonthlyIncome.toLocaleString('he-IL')}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4">
          <p className="text-xs font-black uppercase tracking-wider text-amber-500 mb-1">ממתינים לאישור תשלום</p>
          <p className="text-lg font-black text-amber-700">
            {wallet.pendingPaymentCount} שיעורים ממתינים לאישור תשלום
          </p>
        </div>
      </div>
    </DashboardCard>
  );
}
