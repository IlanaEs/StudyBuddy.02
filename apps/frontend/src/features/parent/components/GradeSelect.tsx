import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { sbTokens as sb } from '../../../design-system';
import { gradesByLevel } from '../../matching/data/subjectsByLevel';

const BAND_LABELS: Record<string, string> = {
  elementary: 'יסודי',
  middle: 'חטיבת ביניים',
  high: 'תיכון',
  academic: 'אקדמי',
};

/**
 * On-DS grade picker (RTL). A native <select> can't render a dark/tokenized
 * option menu cross-browser, so this is a custom dropdown on canon --sb tokens:
 * dark glass surface, sized to the field, band-grouped, click-outside/Escape.
 */
export function GradeSelect({ value, onChange, placeholder = 'בחר/י שכבה…' }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '11px 13px', borderRadius: sb.radiusSmall, border: `1px solid ${sb.borderCyber}`,
          background: sb.glassSoft, color: value ? sb.textPrimary : sb.textMuted,
          fontSize: 14, fontFamily: sb.fontUi, cursor: 'pointer', textAlign: 'start',
        }}
      >
        <span>{value || placeholder}</span>
        <ChevronDown size={16} style={{ color: sb.textMuted, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease' }} />
      </button>

      {open && (
        <div
          role="listbox"
          className="sb-card"
          style={{ position: 'absolute', insetInlineStart: 0, insetInlineEnd: 0, top: 'calc(100% + 6px)', zIndex: 50, maxHeight: 240, overflowY: 'auto', padding: 6, borderRadius: sb.radiusSmall }}
        >
          {Object.entries(gradesByLevel).map(([band, grades]) => (
            <div key={band}>
              <div style={{ fontSize: 11, fontWeight: 700, color: sb.textMuted, padding: '8px 10px 4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {BAND_LABELS[band] ?? band}
              </div>
              {grades.map((g) => {
                const selected = g === value;
                return (
                  <button
                    key={g}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => { onChange(g); setOpen(false); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      padding: '9px 10px', borderRadius: sb.radiusSmall, border: 'none',
                      background: selected ? `color-mix(in oklab, ${sb.active} 16%, transparent)` : 'transparent',
                      color: selected ? sb.active : sb.textPrimary,
                      fontSize: 13.5, fontWeight: selected ? 700 : 500, cursor: 'pointer', textAlign: 'start',
                    }}
                    onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = sb.glassSoft; }}
                    onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span>{g}</span>
                    {selected && <Check size={14} strokeWidth={3} style={{ flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
