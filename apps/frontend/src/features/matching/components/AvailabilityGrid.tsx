import { useState } from 'react';

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'] as const;

const DAY_ABBR: Record<string, string> = {
  ראשון: "א'",
  שני: "ב'",
  שלישי: "ג'",
  רביעי: "ד'",
  חמישי: "ה'",
  שישי: "ו'",
};

const TIMES: { value: string; label: string }[] = [
  { value: 'morning', label: 'בוקר' },
  { value: 'afternoon', label: 'צהריים' },
  { value: 'evening', label: 'ערב' },
];

interface AvailabilityGridProps {
  selectedDays: string[];
  selectedTimes: string[];
  onChangeDays: (days: string[]) => void;
  onChangeTimes: (times: string[]) => void;
}

function buildInitialCells(days: string[], times: string[]): Set<string> {
  const s = new Set<string>();
  days.forEach((d) => times.forEach((t) => s.add(`${d}:${t}`)));
  return s;
}

export function AvailabilityGrid({ selectedDays, selectedTimes, onChangeDays, onChangeTimes }: AvailabilityGridProps) {
  const [cells, setCells] = useState<Set<string>>(() =>
    buildInitialCells(selectedDays, selectedTimes),
  );

  function toggleCell(day: string, time: string) {
    setCells((prev) => {
      const key = `${day}:${time}`;
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);

      const days = new Set<string>();
      const times = new Set<string>();
      next.forEach((k) => {
        const parts = k.split(':');
        if (parts[0]) days.add(parts[0]);
        if (parts[1]) times.add(parts[1]);
      });

      onChangeDays([...days]);
      onChangeTimes([...times]);

      return next;
    });
  }

  const totalSelected = cells.size;

  return (
    <div className="avail-grid-reveal">
      {/* Helper + count */}
      <div className="flex items-center justify-between mb-3" dir="rtl">
        <span style={{ color: 'var(--text-3)', fontSize: 12 }}>לחץ/י על התאים הרלוונטיים</span>
        {totalSelected > 0 && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{
              background: 'color-mix(in oklab, var(--cyan) 18%, var(--surface-2))',
              color: 'var(--cyan)',
              border: '1px solid color-mix(in oklab, var(--cyan) 30%, var(--line-2))',
            }}
          >
            {totalSelected} נבחרו
          </span>
        )}
      </div>

      {/* Grid — scrollable on small screens */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
        <div style={{ minWidth: 300 }}>
          {/* Header: day labels */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '52px repeat(6, 1fr)',
              gap: 3,
              marginBottom: 4,
            }}
          >
            <div />
            {DAYS.map((day) => (
              <div
                key={day}
                style={{
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-3)',
                  padding: '4px 2px',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '0.02em',
                }}
              >
                {DAY_ABBR[day]}
              </div>
            ))}
          </div>

          {/* Time rows */}
          {TIMES.map(({ value, label }) => (
            <div
              key={value}
              style={{
                display: 'grid',
                gridTemplateColumns: '52px repeat(6, 1fr)',
                gap: 3,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingInlineEnd: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-2)',
                }}
              >
                {label}
              </div>
              {DAYS.map((day) => {
                const key = `${day}:${value}`;
                const sel = cells.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleCell(day, value)}
                    className="avail-cell"
                    aria-label={`${day} ${label}`}
                    aria-pressed={sel}
                    style={{
                      height: 38,
                      borderRadius: 8,
                      border: `1.5px solid ${sel ? 'var(--cyan)' : 'var(--line-2)'}`,
                      background: sel
                        ? 'color-mix(in oklab, var(--cyan) 22%, var(--surface-2))'
                        : 'var(--surface-2)',
                      boxShadow: sel
                        ? '0 0 0 1px color-mix(in oklab, var(--cyan) 28%, transparent), inset 0 1px 0 rgba(220,245,240,0.08)'
                        : 'none',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {sel && (
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 11 11"
                        fill="none"
                        aria-hidden="true"
                        style={{ color: 'var(--cyan)' }}
                      >
                        <path
                          d="M1.5 5.5l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
