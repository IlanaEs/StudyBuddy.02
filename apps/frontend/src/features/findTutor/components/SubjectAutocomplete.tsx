import { useMemo, useState } from 'react';
import { Search, Check, PenLine } from 'lucide-react';
import { sbTokens as sb } from '../../../design/tokens';
import { subjectsByLevel } from '../../matching/data/subjectsByLevel';

// Flattened, de-duplicated canonical subject list (⊆ canonicalSubjects via P0-1's
// guard). Strict: only these resolve at booking; off-taxonomy is captured, not submitted.
const CANONICAL_SUBJECTS: string[] = [...new Set(Object.values(subjectsByLevel).flat())].sort();

export function SubjectAutocomplete({
  value,
  isCustom,
  onChange,
}: {
  value: string;
  isCustom: boolean;
  onChange: (subject: string, custom: boolean) => void;
}) {
  const [search, setSearch] = useState('');
  const [manual, setManual] = useState(isCustom);

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return CANONICAL_SUBJECTS.slice(0, 24);
    return CANONICAL_SUBJECTS.filter((s) => s.includes(q)).slice(0, 24);
  }, [search]);

  if (manual) {
    return (
      <div>
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value, true)}
          placeholder="הקלידו את שם המקצוע"
          style={inputStyle}
        />
        <p style={{ margin: '8px 0 0', fontSize: 12, color: sb.textSecondary }}>
          מקצוע זה אינו ברשימה — הוא יישלח לבדיקה ולא ניתן להזמין עליו שיעור עדיין.
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
        לא מצאת את המקצוע? הקלד להתאמה ידנית
      </button>
    </div>
  );
}

export const CANONICAL_SUBJECT_SET = new Set(CANONICAL_SUBJECTS);

const inputStyle = {
  width: '100%',
  padding: '11px 12px',
  borderRadius: sb.radiusSmall,
  background: sb.glassSoft,
  border: `1px solid ${sb.borderMuted}`,
  color: sb.textPrimary,
  fontFamily: sb.fontUi,
  fontSize: 14,
  outline: 'none',
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
