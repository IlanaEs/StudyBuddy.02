import { useMemo, useState } from 'react';
import { Search, Check, PenLine } from 'lucide-react';
import { towTokens as T } from '../../../design/tokens';
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
          className="tow-focusable"
          style={inputStyle}
        />
        <p style={{ margin: '8px 0 0', fontSize: 12, color: T.gold }}>
          מקצוע זה אינו ברשימה — הוא יישלח לבדיקה ולא ניתן להזמין עליו שיעור עדיין.
        </p>
        <button type="button" onClick={() => { setManual(false); onChange('', false); }} style={linkStyle(T.text3)}>
          חזרה לבחירה מהרשימה
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', insetInlineStart: 12, top: 13, color: T.text3 }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש מקצוע…"
          className="tow-focusable"
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
                padding: '8px 12px', borderRadius: T.radiusSm,
                border: `1.5px solid ${selected ? T.neon : T.ink}`,
                background: selected ? 'color-mix(in oklab, #00f6ff 14%, transparent)' : 'transparent',
                color: selected ? T.neon : T.text2,
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                transition: 'border-color 250ms ease-out, color 250ms ease-out, background 250ms ease-out',
              }}
            >
              {selected && <Check size={14} />}
              {s}
            </button>
          );
        })}
        {filtered.length === 0 && <span style={{ fontSize: 13, color: T.text3 }}>לא נמצא מקצוע תואם.</span>}
      </div>

      {/* Off-taxonomy fallback (pink alert link). */}
      <button type="button" onClick={() => { setManual(true); onChange(search.trim(), true); }} style={linkStyle(T.alert)}>
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
  borderRadius: T.radiusSm,
  background: 'color-mix(in oklab, #3f7e76 30%, transparent)',
  border: `1px solid ${T.ink}`,
  color: T.text,
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
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
  } as const;
}
