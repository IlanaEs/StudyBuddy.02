const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
const TIMES = ['09:00', '11:00', '14:00', '16:00', '18:00', '20:00'];

interface BookingSlotPickerProps {
  selectedDay: string;
  selectedTime: string;
  onDayChange: (day: string) => void;
  onTimeChange: (time: string) => void;
}

export function BookingSlotPicker({ selectedDay, selectedTime, onDayChange, onTimeChange }: BookingSlotPickerProps) {
  return (
    <div>
      <div className="mb-4">
        <div className="font-semibold mb-2" style={{ color: 'var(--text-2)', fontSize: 14 }}>בחר/י יום:</div>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => (
            <button
              key={d}
              onClick={() => onDayChange(d)}
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
        <div className="flex flex-wrap gap-2">
          {TIMES.map((t) => (
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
      </div>
    </div>
  );
}
