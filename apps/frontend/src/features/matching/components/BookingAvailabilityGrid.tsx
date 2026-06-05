import { useMemo } from 'react';
import { towTokens as T } from '../../../design/tokens';
import type { TeacherAvailabilitySlot } from '../types/matching.types';

// Fallback grid shown when the teacher has no published availability, so booking
// still works. Marked as estimated in the UI.
const FALLBACK_DOWS = [0, 1, 2, 3, 4, 5];
const FALLBACK_TIMES = ['09:00', '11:00', '14:00', '16:00', '18:00', '20:00'];

const DOW_TO_HEBREW: Record<number, string> = {
  0: 'ראשון', 1: 'שני', 2: 'שלישי', 3: 'רביעי', 4: 'חמישי', 5: 'שישי', 6: 'שבת',
};
const DOW_ORDER = [0, 1, 2, 3, 4, 5, 6];

// Expands a slot into 1-hour lesson starts, e.g. 14:00–18:00 → 14,15,16,17.
function hourlyStarts(startTime: string, endTime: string): string[] {
  const [sh = 0, sm = 0] = startTime.split(':').map((n) => parseInt(n, 10));
  const [eh = 0, em = 0] = endTime.split(':').map((n) => parseInt(n, 10));
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  const out: string[] = [];
  for (let m = start; m + 60 <= end; m += 60) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
}

type Grid = {
  estimated: boolean;
  days: Array<{ dow: number; label: string }>;
  hours: string[];
  available: Set<string>; // `${dow}|${HH:MM}`
};

function buildGrid(slots: TeacherAvailabilitySlot[] | undefined): Grid {
  const estimated = !slots || slots.length === 0;
  const available = new Set<string>();

  if (estimated) {
    for (const dow of FALLBACK_DOWS) for (const t of FALLBACK_TIMES) available.add(`${dow}|${t}`);
    return {
      estimated,
      days: FALLBACK_DOWS.map((dow) => ({ dow, label: DOW_TO_HEBREW[dow]! })),
      hours: [...FALLBACK_TIMES],
      available,
    };
  }

  for (const slot of slots!) {
    for (const t of hourlyStarts(slot.startTime, slot.endTime)) available.add(`${slot.dayOfWeek}|${t}`);
  }
  const presentDows = new Set([...available].map((k) => Number(k.split('|')[0])));
  const days = DOW_ORDER.filter((d) => presentDows.has(d)).map((dow) => ({ dow, label: DOW_TO_HEBREW[dow]! }));
  const hours = [...new Set([...available].map((k) => k.split('|')[1]!))].sort();
  return { estimated, days, hours, available };
}

export function BookingAvailabilityGrid({
  availabilitySlots,
  selectedDay,
  selectedTime,
  onSelect,
}: {
  availabilitySlots?: TeacherAvailabilitySlot[];
  selectedDay: string;
  selectedTime: string;
  onSelect: (day: string, time: string) => void;
}) {
  const grid = useMemo(() => buildGrid(availabilitySlots), [availabilitySlots]);

  return (
    <div>
      <p style={{ margin: '0 0 12px', fontSize: 12.5, color: T.text3 }}>
        {grid.estimated
          ? 'למורה אין זמינות מפורסמת — מוצגת זמינות משוערת.'
          : 'מוצגים רק הימים והשעות שבהם המורה זמין/ה.'}
      </p>

      <div style={{ overflowX: 'auto' }}>
        <div
          role="grid"
          style={{
            display: 'grid',
            gridTemplateColumns: `48px repeat(${grid.days.length}, minmax(72px, 1fr))`,
            gap: 6,
            minWidth: 'fit-content',
          }}
        >
          {/* Header row: empty corner + day labels */}
          <div />
          {grid.days.map((d) => (
            <div
              key={`h-${d.dow}`}
              style={{ textAlign: 'center', fontSize: 12.5, fontWeight: 700, color: T.text2, paddingBottom: 2 }}
            >
              {d.label}
            </div>
          ))}

          {/* One row per hour */}
          {grid.hours.map((hour) => (
            <Row
              key={hour}
              hour={hour}
              days={grid.days}
              available={grid.available}
              selectedDay={selectedDay}
              selectedTime={selectedTime}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({
  hour,
  days,
  available,
  selectedDay,
  selectedTime,
  onSelect,
}: {
  hour: string;
  days: Array<{ dow: number; label: string }>;
  available: Set<string>;
  selectedDay: string;
  selectedTime: string;
  onSelect: (day: string, time: string) => void;
}) {
  return (
    <>
      {/* Time gutter (Monospace) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontFamily: T.fontMono, fontSize: 12, color: T.text3, paddingInlineEnd: 4 }}>
        {hour}
      </div>

      {days.map((d) => {
        const isAvailable = available.has(`${d.dow}|${hour}`);
        const isSelected = isAvailable && selectedDay === d.label && selectedTime === hour;

        if (!isAvailable) {
          // Blocked / taken — dashed, opaque, not clickable.
          return (
            <div
              key={`${d.dow}-${hour}`}
              aria-disabled="true"
              style={{
                height: 38,
                borderRadius: T.radiusSm,
                border: `1px dashed ${T.line}`,
                background: 'color-mix(in oklab, #0b2b2a 55%, transparent)',
                opacity: 0.5,
              }}
            />
          );
        }

        return (
          <button
            key={`${d.dow}-${hour}`}
            type="button"
            className={`tow-slot${isSelected ? '' : ' tow-slot--available'}`}
            onClick={() => onSelect(d.label, hour)}
            aria-pressed={isSelected}
            style={{
              height: 38,
              borderRadius: T.radiusSm,
              cursor: 'pointer',
              fontFamily: T.fontMono,
              fontSize: 12.5,
              fontWeight: 700,
              border: `1.5px solid ${T.neon}`,
              background: isSelected ? T.neon : 'color-mix(in oklab, #00f6ff 8%, transparent)',
              color: isSelected ? '#04201f' : T.neon,
              boxShadow: isSelected ? `0 0 14px -2px ${T.neon}` : 'none',
            }}
          >
            {hour}
          </button>
        );
      })}
    </>
  );
}
