import { useMemo } from 'react';
import type { TeacherAvailabilitySlot } from '../types/matching.types';

// Fallback options shown only when the teacher has no published availability.
const FALLBACK_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
const FALLBACK_TIMES = ['09:00', '11:00', '14:00', '16:00', '18:00', '20:00'];

const DOW_TO_HEBREW: Record<number, string> = {
  0: 'ראשון', 1: 'שני', 2: 'שלישי', 3: 'רביעי', 4: 'חמישי', 5: 'שישי', 6: 'שבת',
};
const HEBREW_ORDER = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

// Expands a slot into 1-hour lesson start times, e.g. 14:00–18:00 → 14:00,15:00,16:00,17:00.
function hourlyStarts(startTime: string, endTime: string): string[] {
  const [sh = 0, sm = 0] = startTime.split(':').map((n) => parseInt(n, 10));
  const [eh = 0, em = 0] = endTime.split(':').map((n) => parseInt(n, 10));
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const out: string[] = [];
  for (let m = startMin; m + 60 <= endMin; m += 60) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
}

interface BookingSlotPickerProps {
  selectedDay: string;
  selectedTime: string;
  onDayChange: (day: string) => void;
  onTimeChange: (time: string) => void;
  /** The teacher's real bookable weekly slots. When empty/undefined, a generic fallback grid is shown. */
  availabilitySlots?: TeacherAvailabilitySlot[];
}

export function BookingSlotPicker({
  selectedDay,
  selectedTime,
  onDayChange,
  onTimeChange,
  availabilitySlots,
}: BookingSlotPickerProps) {
  const hasRealAvailability = !!availabilitySlots && availabilitySlots.length > 0;

  // Days the teacher is actually available, in week order.
  const days = useMemo(() => {
    if (!hasRealAvailability) return FALLBACK_DAYS;
    const present = new Set(
      availabilitySlots!
        .map((s) => DOW_TO_HEBREW[s.dayOfWeek])
        .filter((d): d is string => !!d),
    );
    return HEBREW_ORDER.filter((d) => present.has(d));
  }, [availabilitySlots, hasRealAvailability]);

  // Start times available on the currently-selected day.
  const times = useMemo(() => {
    if (!hasRealAvailability) return FALLBACK_TIMES;
    if (!selectedDay) return [];
    const starts = new Set<string>();
    for (const slot of availabilitySlots!) {
      if (DOW_TO_HEBREW[slot.dayOfWeek] !== selectedDay) continue;
      for (const t of hourlyStarts(slot.startTime, slot.endTime)) starts.add(t);
    }
    return [...starts].sort();
  }, [availabilitySlots, hasRealAvailability, selectedDay]);

  return (
    <div>
      {hasRealAvailability && (
        <div className="mb-3" style={{ color: 'var(--text-3)', fontSize: 12 }}>
          מוצגים רק הימים והשעות שבהם המורה זמין/ה.
        </div>
      )}
      <div className="mb-4">
        <div className="font-semibold mb-2" style={{ color: 'var(--text-2)', fontSize: 14 }}>בחר/י יום:</div>
        <div className="flex flex-wrap gap-2">
          {days.map((d) => (
            <button
              key={d}
              onClick={() => {
                onDayChange(d);
                // Clear a time that no longer belongs to the newly-selected day.
                if (selectedTime) onTimeChange('');
              }}
              className="px-3 py-1 rounded-lg text-sm font-medium"
              style={{
                background: selectedDay === d ? 'var(--cyan)' : 'var(--surface-2)',
                color: selectedDay === d ? '#0f4544' : 'var(--text)',
                border: `1px solid ${selectedDay === d ? 'var(--cyan)' : 'var(--line-2)'}`,
                cursor: 'pointer',
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="font-semibold mb-2" style={{ color: 'var(--text-2)', fontSize: 14 }}>בחר/י שעה:</div>
        {hasRealAvailability && selectedDay && times.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: 13 }}>אין שעות פנויות ביום זה.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {times.map((t) => (
              <button
                key={t}
                onClick={() => onTimeChange(t)}
                className="px-3 py-1 rounded-lg text-sm font-medium"
                style={{
                  background: selectedTime === t ? 'var(--cyan)' : 'var(--surface-2)',
                  color: selectedTime === t ? '#0f4544' : 'var(--text)',
                  border: `1px solid ${selectedTime === t ? 'var(--cyan)' : 'var(--line-2)'}`,
                  cursor: 'pointer',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
