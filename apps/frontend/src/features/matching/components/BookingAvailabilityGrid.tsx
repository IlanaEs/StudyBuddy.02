import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { towTokens as T } from '../../../design/tokens';
import type { TeacherAvailabilitySlot } from '../types/matching.types';
import type { DatedSlot } from '../api/teacherAvailabilityRange';
import { contiguousNext, dayLabel, isPastIso, jerusalemHHMM } from '../utils/bookingGrid';

export type GridSelection = { date: string; startAt: string; endAt: string };

const FALLBACK_HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
const PAGE_SIZE = 5;

function hourlyStarts(startTime: string, endTime: string): string[] {
  const [sh = 0, sm = 0] = startTime.split(':').map((n) => parseInt(n, 10));
  const [eh = 0, em = 0] = endTime.split(':').map((n) => parseInt(n, 10));
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  const out: string[] = [];
  for (let m = start; m + 60 <= end; m += 60) out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  return out;
}

function buildRowHours(slots: TeacherAvailabilitySlot[] | undefined): string[] {
  if (!slots || slots.length === 0) return FALLBACK_HOURS;
  const set = new Set<string>();
  for (const s of slots) for (const h of hourlyStarts(s.startTime, s.endTime)) set.add(h);
  return [...set].sort();
}

export function BookingAvailabilityGrid({
  availabilitySlots,
  dates,
  availableByDate,
  loading,
  doubleMode,
  selection,
  onSelect,
}: {
  availabilitySlots?: TeacherAvailabilitySlot[];
  dates: string[];
  availableByDate: Record<string, DatedSlot[]>;
  loading: boolean;
  doubleMode: boolean;
  selection: GridSelection | null;
  onSelect: (sel: GridSelection) => void;
}) {
  const [page, setPage] = useState(0);
  const maxPage = Math.max(0, Math.ceil(dates.length / PAGE_SIZE) - 1);
  const visibleDates = dates.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  // Rows come from the teacher's recurring window shape, unioned with the actual
  // available-slot times so every free slot is guaranteed a row (robust to
  // round-hour alignment / non-hour window starts).
  const rowHours = useMemo(() => {
    const set = new Set(buildRowHours(availabilitySlots));
    for (const slots of Object.values(availableByDate)) for (const s of slots) set.add(jerusalemHHMM(s.start_at));
    return [...set].sort();
  }, [availabilitySlots, availableByDate]);

  // date → (HH:MM → free slot)
  const availMap = useMemo(() => {
    const m: Record<string, Map<string, DatedSlot>> = {};
    for (const [date, slots] of Object.entries(availableByDate)) {
      const mm = new Map<string, DatedSlot>();
      for (const s of slots) mm.set(jerusalemHHMM(s.start_at), s);
      m[date] = mm;
    }
    return m;
  }, [availableByDate]);

  function pick(date: string, slot: DatedSlot) {
    if (doubleMode) {
      const next = contiguousNext(availableByDate[date] ?? [], slot);
      if (!next) return; // guarded by rendering; never select a broken pair
      onSelect({ date, startAt: slot.start_at, endAt: next.end_at });
    } else {
      onSelect({ date, startAt: slot.start_at, endAt: slot.end_at });
    }
  }

  return (
    <div>
      {/* Pager */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <PagerButton aria-label="ימים קודמים" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
          <ChevronRight size={18} />
        </PagerButton>
        <span style={{ fontSize: 12, color: T.text3, fontFamily: T.fontMono }}>
          {page === 0 ? 'ימים 1–5' : `ימים ${page * PAGE_SIZE + 1}–${Math.min(dates.length, page * PAGE_SIZE + PAGE_SIZE)}`}
        </span>
        <PagerButton aria-label="ימים הבאים" disabled={page >= maxPage} onClick={() => setPage((p) => Math.min(maxPage, p + 1))}>
          <ChevronLeft size={18} />
        </PagerButton>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: T.text3 }}>טוען זמינות…</p>
      ) : (
        <div style={{ maxHeight: 340, overflowY: 'auto', overflowX: 'auto' }}>
          <div
            role="grid"
            style={{ display: 'grid', gridTemplateColumns: `52px repeat(${visibleDates.length}, minmax(64px, 1fr))`, gap: 6, minWidth: 'fit-content' }}
          >
            {/* Header row (sticky) */}
            <div style={{ position: 'sticky', top: 0 }} />
            {visibleDates.map((date) => {
              const { weekday, dm } = dayLabel(date);
              return (
                <div key={`h-${date}`} style={{ position: 'sticky', top: 0, textAlign: 'center', paddingBottom: 4, background: T.bg }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text2 }}>{weekday}</div>
                  <div style={{ fontSize: 11.5, color: T.text3, fontFamily: T.fontMono }}>{dm}</div>
                </div>
              );
            })}

            {/* Rows */}
            {rowHours.map((hour) => (
              <Row
                key={hour}
                hour={hour}
                dates={visibleDates}
                availMap={availMap}
                availableByDate={availableByDate}
                doubleMode={doubleMode}
                selection={selection}
                onPick={pick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  hour,
  dates,
  availMap,
  availableByDate,
  doubleMode,
  selection,
  onPick,
}: {
  hour: string;
  dates: string[];
  availMap: Record<string, Map<string, DatedSlot>>;
  availableByDate: Record<string, DatedSlot[]>;
  doubleMode: boolean;
  selection: GridSelection | null;
  onPick: (date: string, slot: DatedSlot) => void;
}) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontFamily: T.fontMono, fontSize: 12, color: T.text3, paddingInlineEnd: 4 }}>
        {hour}
      </div>

      {dates.map((date) => {
        const slot = availMap[date]?.get(hour);
        const key = `${date}-${hour}`;

        if (!slot) {
          // Taken / outside window — dark, visible, not clickable.
          return <div key={key} aria-disabled="true" style={cellStyle({ kind: 'taken' })} />;
        }
        if (isPastIso(slot.start_at)) {
          return <div key={key} aria-disabled="true" style={cellStyle({ kind: 'past' })} />;
        }

        const selected =
          !!selection && selection.date === date && slot.start_at >= selection.startAt && slot.end_at <= selection.endAt;
        const doubleIneligible = doubleMode && !selected && !contiguousNext(availableByDate[date] ?? [], slot);

        if (doubleIneligible) {
          return (
            <div key={key} aria-disabled="true" title="אין שיעור עוקב פנוי לשיעור כפול" style={cellStyle({ kind: 'ineligible' })}>
              {hour}
            </div>
          );
        }

        return (
          <button
            key={key}
            type="button"
            className={selected ? undefined : 'tow-slot tow-slot--available'}
            onClick={() => onPick(date, slot)}
            aria-pressed={selected}
            style={cellStyle({ kind: selected ? 'selected' : 'available' })}
          >
            {hour}
          </button>
        );
      })}
    </>
  );
}

function PagerButton({ children, disabled, onClick, ...rest }: { children: React.ReactNode; disabled: boolean; onClick: () => void; 'aria-label': string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      {...rest}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 34,
        height: 34,
        borderRadius: T.radiusSm,
        border: `1px solid ${T.ink}`,
        background: 'color-mix(in oklab, #3f7e76 40%, transparent)',
        color: disabled ? T.text3 : T.text,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'opacity 250ms ease-out',
      }}
    >
      {children}
    </button>
  );
}

function cellStyle({ kind }: { kind: 'taken' | 'past' | 'ineligible' | 'available' | 'selected' }): React.CSSProperties {
  const base: React.CSSProperties = {
    height: 36,
    borderRadius: T.radiusSm,
    fontFamily: T.fontMono,
    fontSize: 12,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  switch (kind) {
    case 'available':
      return { ...base, cursor: 'pointer', border: `1.5px solid ${T.neon}`, background: 'color-mix(in oklab, #00f6ff 8%, transparent)', color: T.neon };
    case 'selected':
      return { ...base, cursor: 'pointer', border: `1.5px solid ${T.neon}`, background: T.neon, color: '#04201f', boxShadow: `0 0 14px -2px ${T.neon}` };
    case 'ineligible':
      return { ...base, cursor: 'not-allowed', border: `1.5px solid ${T.line}`, background: 'color-mix(in oklab, #00f6ff 5%, transparent)', color: T.text3, opacity: 0.45 };
    case 'past':
      return { ...base, border: `1px dashed ${T.line}`, background: 'color-mix(in oklab, #0b2b2a 50%, transparent)', opacity: 0.35 };
    case 'taken':
    default:
      return { ...base, border: `1px dashed ${T.line}`, background: 'color-mix(in oklab, #0b2b2a 55%, transparent)', opacity: 0.5 };
  }
}
