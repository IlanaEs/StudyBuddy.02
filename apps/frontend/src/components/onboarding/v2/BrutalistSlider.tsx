import { Minus, Plus } from 'lucide-react';
import { towTokens as T } from '../../../design/tokens';

interface BrutalistSliderProps {
  label: string;
  value: number | null;
  options: number[];      // discrete steps (ordered ascending)
  onChange: (v: number) => void;
  suffix?: string;        // e.g. "שעות", "תלמידים"
  sweetSpot?: (v: number) => boolean; // highlight the handle in success color
  valueColor?: (v: number) => string; // override the numeric color (pricing competitiveness)
}

/**
 * Brutalist square-handle slider over discrete options, with minus/plus bounds,
 * a trailing neon path, and an instant monospace counter. Value snaps to the
 * provided options array.
 */
export function BrutalistSlider({
  label,
  value,
  options,
  onChange,
  suffix,
  sweetSpot,
  valueColor,
}: BrutalistSliderProps) {
  const idx = value == null ? -1 : options.indexOf(value);
  const pct = idx < 0 ? 0 : (idx / Math.max(1, options.length - 1)) * 100;
  const current = value ?? options[0] ?? 0;
  const sweet = value != null && sweetSpot?.(value);
  const numColor = value != null && valueColor ? valueColor(value) : sweet ? T.success : T.neon;

  function step(dir: -1 | 1) {
    const base = idx < 0 ? 0 : idx;
    const next = Math.max(0, Math.min(options.length - 1, base + dir));
    const v = options[next];
    if (v != null) onChange(v);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{label}</span>
        <span style={{ fontFamily: T.fontMono, fontSize: 20, fontWeight: 800, color: numColor }}>
          {value == null ? '—' : current}
          {suffix && value != null ? <span style={{ fontSize: 12, color: T.text3, marginInlineStart: 4 }}>{suffix}</span> : null}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="הפחת"
          style={squareBtn}
        >
          <Minus size={16} />
        </button>
        <div style={{ position: 'relative', flex: 1, height: 8, background: T.line, borderRadius: 2 }}>
          <div style={{ position: 'absolute', insetInlineStart: 0, top: 0, height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${T.orange}, ${T.neon})`, borderRadius: 2, transition: 'width 180ms ease' }} />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              insetInlineStart: `calc(${pct}% - 9px)`,
              width: 18, height: 18,
              transform: 'translateY(-50%)',
              background: sweet ? T.success : T.neon,
              border: '2px solid #0a1414',
              boxShadow: `0 0 10px ${sweet ? T.success : T.neon}`,
              transition: 'inset-inline-start 180ms ease, background 180ms ease',
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="הוסף"
          style={squareBtn}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

const squareBtn: React.CSSProperties = {
  width: 34, height: 34, flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: T.card2, border: `1.5px solid ${T.line2}`, borderRadius: 6,
  color: T.text, cursor: 'pointer',
};
