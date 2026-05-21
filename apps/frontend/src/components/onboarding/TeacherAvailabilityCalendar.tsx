import { Check } from 'lucide-react';

// ── Constants ───────────────────────────────────────────────────────────────────

export const AVAIL_DAYS = [
  'ראשון',
  'שני',
  'שלישי',
  'רביעי',
  'חמישי',
  'שישי',
  'שבת',
] as const;

export type AvailDay = typeof AVAIL_DAYS[number];

export type TimeBlockId = 'morning' | 'afternoon' | 'evening';

export type TimeBlock = {
  id: TimeBlockId;
  label: string;
  range: string;
};

export const TIME_BLOCKS: TimeBlock[] = [
  { id: 'morning', label: 'בוקר', range: '08:00–13:00' },
  { id: 'afternoon', label: 'צהריים', range: '13:00–18:00' },
  { id: 'evening', label: 'ערב', range: '18:00–22:00' },
];

export const TIME_BLOCK_RANGES: Record<TimeBlockId, { start: string; end: string }> = {
  morning: { start: '08:00', end: '13:00' },
  afternoon: { start: '13:00', end: '18:00' },
  evening: { start: '18:00', end: '22:00' },
};

// ── Helpers ─────────────────────────────────────────────────────────────────────

export function makeBlockKey(day: AvailDay, blockId: TimeBlockId): string {
  return `${day}-${blockId}`;
}

// ── Component ───────────────────────────────────────────────────────────────────

interface TeacherAvailabilityCalendarProps {
  selectedBlocks: string[];
  busyBlocks?: string[];
  onChange: (newBlocks: string[]) => void;
}

export function TeacherAvailabilityCalendar({
  selectedBlocks,
  busyBlocks = [],
  onChange,
}: TeacherAvailabilityCalendarProps) {
  const selectedSet = new Set(selectedBlocks);
  const busySet = new Set(busyBlocks);

  function toggleCell(day: AvailDay, blockId: TimeBlockId) {
    const key = makeBlockKey(day, blockId);
    if (busySet.has(key)) return;
    const next = selectedSet.has(key)
      ? selectedBlocks.filter((k) => k !== key)
      : [...selectedBlocks, key];
    onChange(next);
  }

  function toggleDay(day: AvailDay) {
    const dayKeys = TIME_BLOCKS.map((b) => makeBlockKey(day, b.id)).filter((k) => !busySet.has(k));
    const allSelected = dayKeys.every((k) => selectedSet.has(k));
    if (allSelected) {
      // Deselect all non-busy cells for this day
      onChange(selectedBlocks.filter((k) => !dayKeys.includes(k)));
    } else {
      // Select all non-busy cells for this day
      const next = new Set(selectedBlocks);
      dayKeys.forEach((k) => next.add(k));
      onChange([...next]);
    }
  }

  const totalSelected = selectedBlocks.length;

  return (
    <div>
      {totalSelected > 0 && (
        <div
          style={{
            marginBottom: 8,
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--blue)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {totalSelected} בלוקים פעילים
        </div>
      )}

      <div className="ob-avail-grid">
        {/* Row 0: header */}
        {/* Spacer cell */}
        <div />
        {TIME_BLOCKS.map((block) => (
          <div key={block.id} className="ob-avail-header">
            <span className="ob-avail-header-label">{block.label}</span>
            <span className="ob-avail-header-range">{block.range}</span>
          </div>
        ))}

        {/* Rows 1–7: one per day */}
        {AVAIL_DAYS.map((day) => {
          const dayKeys = TIME_BLOCKS.map((b) => makeBlockKey(day, b.id)).filter(
            (k) => !busySet.has(k),
          );
          const allDaySelected = dayKeys.length > 0 && dayKeys.every((k) => selectedSet.has(k));

          return [
            // Day label button
            <button
              key={`day-${day}`}
              type="button"
              onClick={() => toggleDay(day)}
              className={`ob-avail-day${allDaySelected ? ' ob-avail-day--active' : ''}`}
            >
              {day}
            </button>,

            // Time block cells
            ...TIME_BLOCKS.map((block) => {
              const key = makeBlockKey(day, block.id);
              const isBusy = busySet.has(key);
              const isSelected = !isBusy && selectedSet.has(key);

              const classes = [
                'ob-avail-cell',
                isSelected ? 'ob-avail-cell--selected' : '',
                isBusy ? 'ob-avail-cell--busy' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleCell(day, block.id)}
                  disabled={isBusy}
                  className={classes}
                  aria-label={`${day} ${block.label}`}
                  aria-pressed={isSelected}
                >
                  {isSelected && <Check size={12} />}
                  {isBusy && <span className="ob-avail-busy-label">עסוק</span>}
                </button>
              );
            }),
          ];
        })}
      </div>
    </div>
  );
}
