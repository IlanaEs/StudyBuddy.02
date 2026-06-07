import { useMemo, useState } from 'react';
import { Search, Check, PenLine } from 'lucide-react';
import { sbTokens as sb } from '../../../design/tokens';
import { subjectsForLevel } from '../../matching/data/subjectsByLevel';

export function SubjectAutocomplete({
  value,
  isCustom,
  level,
  onChange,
}: {
  value: string;
  isCustom: boolean;
  /** Effective level (band key or specific grade) — the catalog is filtered to it. */
  level: string | null;
  onChange: (subject: string, custom: boolean) => void;
}) {
  const [search, setSearch] = useState('');
  const [manual, setManual] = useState(isCustom);

  // Closed catalog scoped to the student's effective level (band). Falls back to
  // the full catalog only when no band is resolvable.
  const catalog = useMemo(() => subjectsForLevel(level), [level]);

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return catalog.slice(0, 24);
    return catalog.filter((s) => s.includes(q)).slice(0, 24);
  }, [search, catalog]);

  if (manual) {
    return (
      <div>
        <input
          autoFocus
          className="sb-input"
          value={value}
          onChange={(e) => onChange(e.target.value, true)}
          placeholder="הקלידו את שם המקצוע"
          style={inputStyle}
        />
        <p style={{ margin: '8px 0 0', fontSize: 12, color: sb.textSecondary }}>
          הקלד את שם הקורס המדויק, ואנחנו נבצע התאמה ידנית עבורך.
        </p>
        <button type="button" onClick={() => { setManual(false); onChange('', false); }} style={linkStyle(sb.textMuted)}>
          חזרה לבחירה מהרשימה
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', insetInlineStart: 12, top: 13, color: sb.textMuted }} />
        <input
          className="sb-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש מקצוע…"
          style={{ ...inputStyle, paddingInlineStart: 34 }}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, maxHeight: 180, overflowY: 'auto' }}>
        {filtered.map((s) => {
          const selected = !isCustom && value === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s, false)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: sb.radiusSmall,
                border: `1.5px solid ${selected ? sb.active : sb.borderMuted}`,
                background: selected ? sb.hoverGlow : 'transparent',
                color: selected ? sb.active : sb.textSecondary,
                fontFamily: sb.fontUi, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                transition: 'border-color var(--sb-motion-base) ease-out, color var(--sb-motion-base) ease-out, background var(--sb-motion-base) ease-out',
              }}
            >
              {selected && <Check size={14} />}
              {s}
            </button>
          );
        })}
        {filtered.length === 0 && <span style={{ fontSize: 13, color: sb.textMuted }}>לא נמצא מקצוע תואם.</span>}
      </div>

      {/* Off-taxonomy fallback link. */}
      <button type="button" onClick={() => { setManual(true); onChange(search.trim(), true); }} style={linkStyle(sb.error)}>
        <PenLine size={13} style={{ marginInlineEnd: 4, verticalAlign: '-2px' }} />
        לא מצאת את הקורס שלך?
      </button>
    </div>
  );
}

// Layout only — color/border/background/focus come from the shared `.sb-input`
// glass class (turquoise glow on focus).
const inputStyle = {
  width: '100%',
  padding: '11px 12px',
  fontSize: 14,
} as const;

function linkStyle(color: string) {
  return {
    marginTop: 12,
    display: 'inline-block',
    background: 'none',
    border: 'none',
    color,
    fontFamily: sb.fontUi,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
  } as const;
}
