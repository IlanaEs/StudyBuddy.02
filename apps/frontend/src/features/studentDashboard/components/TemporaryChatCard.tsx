import { Lock, MessageCircle } from 'lucide-react';
import type { StudentDashboardChat } from '../data/mockStudentDashboard';
import { DashboardCard } from './DashboardCard';

type TemporaryChatCardProps = {
  chat: StudentDashboardChat;
};

export function TemporaryChatCard({ chat }: TemporaryChatCardProps) {
  const isOpen = chat.state === 'open';

  return (
    <DashboardCard className="lg:col-start-1 lg:row-start-2">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
              isOpen ? 'bg-cyan-50 text-[#175655]' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {isOpen ? <MessageCircle size={24} aria-hidden="true" /> : <Lock size={23} aria-hidden="true" />}
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950">
              {chat.state === 'none'
                ? "אין צ'אט פעיל כרגע"
                : isOpen
                  ? `צ'אט עם ${chat.teacherName}`
                  : `הצ'אט עם ${chat.teacherName} סגור`}
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              {chat.state === 'none'
                ? "כשיהיה שיעור פעיל או שיעור קרוב, הצ'אט עם המורה יופיע כאן."
                : isOpen
                  ? "זמין להתכתבות. הצ'אט ייסגר 48 שעות לאחר השיעור."
                  : "הצ'אט נעול לצפייה בלבד. הוא יפתח שוב אוטומטית 48 שעות לפני השיעור הבא שלכם."}
            </p>
          </div>
        </div>

        {chat.state !== 'none' ? (
          <button
            className={`inline-flex shrink-0 items-center justify-center rounded-2xl px-4 py-3 text-sm font-black transition ${
              isOpen
                ? 'bg-[#175655] text-white shadow-lg shadow-teal-950/10 hover:-translate-y-0.5'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {isOpen ? 'לשליחת הודעה' : 'לצפייה בהיסטוריית ההודעות'}
          </button>
        ) : null}
      </div>
    </DashboardCard>
  );
}
