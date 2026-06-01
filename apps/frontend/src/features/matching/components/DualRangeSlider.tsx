interface DualRangeSliderProps {
  min: number;
  max: number;
  step?: number;
  valueMin: number;
  valueMax: number;
  onChangeMin: (v: number) => void;
  onChangeMax: (v: number) => void;
  formatValue?: (v: number) => string;
}

export function DualRangeSlider({
  min,
  max,
  step = 10,
  valueMin,
  valueMax,
  onChangeMin,
  onChangeMax,
  formatValue = (v) => `₪${v}`,
}: DualRangeSliderProps) {
  const minPct = ((valueMin - min) / (max - min)) * 100;
  const maxPct = ((valueMax - min) / (max - min)) * 100;

  return (
    <div dir="ltr">
      {/* Live readout */}
      <div
        dir="rtl"
        className="text-center mb-5 px-4 py-3 rounded-xl"
        style={{
          background: 'color-mix(in oklab, var(--cyan) 10%, var(--surface-2))',
          border: '1px solid color-mix(in oklab, var(--cyan) 25%, var(--line-2))',
        }}
      >
        <span style={{ color: 'var(--text-2)', fontSize: 13 }}>הטווח הנבחר: </span>
        <span
          style={{
            color: 'var(--cyan)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          {formatValue(valueMin)}
        </span>
        <span style={{ color: 'var(--text-3)', fontSize: 14, margin: '0 6px' }}>עד</span>
        <span
          style={{
            color: 'var(--cyan)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          {formatValue(valueMax)}
        </span>
        <span style={{ color: 'var(--text-2)', fontSize: 13 }}> לשעה</span>
      </div>

      {/* Slider track + thumbs */}
      <div style={{ position: 'relative', height: 44, display: 'flex', alignItems: 'center', padding: '0 4px' }}>
        {/* Background track */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 6,
            background: 'var(--line-2)',
            borderRadius: 99,
          }}
        />

        {/* Active range fill */}
        <div
          style={{
            position: 'absolute',
            left: `${minPct}%`,
            width: `${maxPct - minPct}%`,
            height: 6,
            background: 'linear-gradient(90deg, var(--cyan), oklch(0.88 0.09 190))',
            borderRadius: 99,
            boxShadow: '0 0 12px 2px color-mix(in oklab, var(--cyan) 45%, transparent)',
            transition: 'left 0.08s, width 0.08s',
          }}
        />

        {/* Min thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueMin}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), valueMax - step);
            onChangeMin(v);
          }}
          className="dual-range-thumb"
          style={{ zIndex: valueMin > max * 0.85 ? 5 : 3 }}
          aria-label="תקציב מינימלי"
        />

        {/* Max thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueMax}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), valueMin + step);
            onChangeMax(v);
          }}
          className="dual-range-thumb"
          style={{ zIndex: 4 }}
          aria-label="תקציב מקסימלי"
        />
      </div>

      {/* Min / max axis labels */}
      <div
        dir="rtl"
        className="flex justify-between mt-1"
        style={{ color: 'var(--text-3)', fontSize: 11, padding: '0 2px' }}
      >
        <span>{formatValue(max)}</span>
        <span>{formatValue(min)}</span>
      </div>
    </div>
  );
}
