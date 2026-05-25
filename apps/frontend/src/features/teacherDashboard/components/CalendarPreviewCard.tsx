import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { DashboardCard } from '../../../components/layout/DashboardCard';
import type { ScheduledLesson } from '../types/teacherDashboard.types';

const HEBREW_DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

function isoToDateParts(iso: string): { year: number; month: number; day: number } {
  const parts = iso.split('-').map(Number);
  return { year: parts[0] ?? 0, month: (parts[1] ?? 1) - 1, day: parts[2] ?? 1 };
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

type Props = { scheduledLessons: ScheduledLesson[] };

export function CalendarPreviewCard({ scheduledLessons }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(toLocalDateString(today));

  const lessonDates = new Set(scheduledLessons.map((l) => l.date));

  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const todayStr = toLocalDateString(today);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const selectedLesson = scheduledLessons.find((l) => l.date === selectedDate);
  const selectedDateObj = new Date(selectedDate + 'T00:00:00');
  const selectedDayName = HEBREW_DAYS[selectedDateObj.getDay()];
  const selectedDateLabel = `${selectedDateObj.getDate()} ${HEBREW_MONTHS[selectedDateObj.getMonth()]}`;

  // Build calendar grid (Sunday-first, 7 cols)
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <DashboardCard className="flex flex-col gap-4 lg:col-start-1 lg:row-start-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#175655]/10 text-[#175655]">
            <CalendarDays size={18} aria-hidden="true" />
          </div>
          <h2 className="text-xl font-black text-slate-950">היומן שלי</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            aria-label="חודש קודם"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 transition"
            onClick={nextMonth}
            type="button"
          >
            <ChevronRight size={16} />
          </button>
          <span className="min-w-[90px] text-center text-sm font-bold text-slate-700">
            {HEBREW_MONTHS[viewMonth]} {viewYear}
          </span>
          <button
            aria-label="חודש הבא"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 transition"
            onClick={prevMonth}
            type="button"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {HEBREW_DAYS.map((d) => (
          <div key={d} className="text-xs font-bold text-slate-400 py-1">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const isoDate = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const hasLesson = lessonDates.has(isoDate);
          const isToday = isoDate === todayStr;
          const isSelected = isoDate === selectedDate;

          return (
            <button
              key={isoDate}
              className={[
                'relative flex flex-col items-center justify-center rounded-xl py-1.5 text-sm font-bold transition',
                isSelected
                  ? 'bg-[#175655] text-white shadow-sm'
                  : isToday
                  ? 'bg-cyan-50 text-[#0f6866] ring-1 ring-[#0f6866]/30'
                  : 'text-slate-700 hover:bg-slate-100',
              ].join(' ')}
              onClick={() => setSelectedDate(isoDate)}
              type="button"
            >
              {day}
              {hasLesson && (
                <span
                  className={[
                    'absolute bottom-0.5 h-1 w-1 rounded-full',
                    isSelected ? 'bg-white/80' : 'bg-[#175655]',
                  ].join(' ')}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day summary */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
        <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
          לו״ז ליום {selectedDayName}, {selectedDateLabel}
        </p>
        {selectedLesson ? (
          <p className="text-sm font-semibold text-slate-800">{selectedLesson.label}</p>
        ) : (
          <p className="text-sm font-semibold text-slate-500">אין שיעורים משובצים ביום זה.</p>
        )}
      </div>
    </DashboardCard>
  );
}
