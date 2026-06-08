import { useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { towTokens as T } from '../../../../design/tokens';
import { BentoTile } from '../BentoGrid';
import { CalendarConnectionBar } from './CalendarConnectionBar';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';

const HEB_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

function dd(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function startOfWeekOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

type CalView = 'month' | 'week';

/**
 * Unified teacher calendar (Calendar & Inbox). One card with a Month ⇄ Week toggle:
 * Month = bird's-eye grid with per-day lesson counts; Week = the rich card-column
 * detail (lessons / pending / Google-busy chips + availability). Shared Google
 * connection bar in the header. System data is the source of truth (the store);
 * Google is a best-effort overlay. No logic beyond reading the store + view state.
 */
export function CalendarPanel() {
  const today = new Date();
  const [view, setView] = useState<CalView>('month');
  const [month, setMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeekOf(new Date()));
  const [dir, setDir] = useState<'l' | 'r'>('l');

  function shiftMonth(delta: number) {
    setMonth((m) => {
      const d = new Date(m.year, m.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }
  function shiftWeek(delta: number) {
    setDir(delta < 0 ? 'r' : 'l');
    setWeekStart((w) => { const d = new Date(w); d.setDate(w.getDate() + delta * 7); return d; });
  }
  function pickDay(day: Date) {
    setWeekStart(startOfWeekOf(day));
    setDir('l');
    setView('week');
  }

  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
  const navLabel = view === 'month' ? `${HEB_MONTHS[month.month]} ${month.year}` : `${dd(weekStart)} – ${dd(weekEnd)}`;
  const onPrev = () => (view === 'month' ? shiftMonth(-1) : shiftWeek(-1));
  const onNext = () => (view === 'month' ? shiftMonth(1) : shiftWeek(1));

  return (
    <BentoTile size="2x2" title="יומן" english="Calendar" icon={<CalendarRange size={16} />}>
      <CalendarConnectionBar />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        {/* View toggle */}
        <div style={{ display: 'inline-flex', padding: 2, borderRadius: 8, border: `1px solid ${T.ink}`, background: `color-mix(in oklab, ${T.card} 30%, transparent)` }}>
          <ToggleBtn label="חודש" active={view === 'month'} onClick={() => setView('month')} />
          <ToggleBtn label="שבוע" active={view === 'week'} onClick={() => setView('week')} />
        </div>

        {/* Adaptive period nav (RTL: ChevronRight = previous) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" aria-label="הקודם" onClick={onPrev} style={navBtn}><ChevronRight size={16} /></button>
          <span style={{ fontFamily: T.fontMono, fontSize: 13, fontWeight: 700, color: T.text2, minWidth: 120, textAlign: 'center' }}>{navLabel}</span>
          <button type="button" aria-label="הבא" onClick={onNext} style={navBtn}><ChevronLeft size={16} /></button>
        </div>
      </div>

      {view === 'month'
        ? <MonthView year={month.year} month={month.month} onPickDay={pickDay} />
        : <WeekView weekStart={weekStart} dir={dir} />}
    </BentoTile>
  );
}

function ToggleBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
        fontSize: 12.5, fontWeight: 800,
        background: active ? `color-mix(in oklab, ${T.neon} 16%, transparent)` : 'transparent',
        color: active ? T.neon : T.text3,
        transition: 'background 200ms ease-out, color 200ms ease-out',
      }}
    >
      {label}
    </button>
  );
}

const navBtn: React.CSSProperties = {
  width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 8, border: `1px solid ${T.ink}`, background: 'transparent', color: T.text2, cursor: 'pointer',
};
