import { Search, Users } from 'lucide-react';
import { towTokens as T } from '../../../../design/tokens';
import { OutlineAvatar } from '../OutlineAvatar';
import { EmptyState } from '../EmptyState';
import { filterStudents } from '../../utils/studentCrm';
import type { DashboardStudent } from '../../types/teacherDashboard.types';
import { glassSurface } from './surface';

export function StudentSidebar({
  students,
  query,
  onQueryChange,
  selectedId,
  onSelect,
}: {
  students: DashboardStudent[];
  query: string;
  onQueryChange: (q: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const matchedIds = new Set(filterStudents(students, query).map((s) => s.id));

  return (
    <section style={glassSurface}>
      <header style={{ padding: '16px 16px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: T.neon, display: 'flex' }}>
            <Users size={16} />
          </span>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text }}>
            תלמידים<span style={{ color: T.text3, fontWeight: 600 }}> (Students)</span>
          </h3>
        </div>
        <label
          className="tow-focusable"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 11px',
            borderRadius: T.radiusSm,
            border: `1.5px solid ${T.line2}`,
            background: T.card2,
          }}
        >
          <Search size={15} style={{ color: T.text3, flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="חיפוש מהיר (Search)"
            aria-label="חיפוש תלמידים (Search students)"
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              color: T.text,
              fontSize: 14,
            }}
          />
        </label>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px' }}>
        {students.length === 0 ? (
          <EmptyState icon={<Users size={26} />} message="עדיין אין תלמידים." />
        ) : (
          <>
            {students.map((s) => {
              const matched = matchedIds.has(s.id);
              const active = s.id === selectedId;
              return (
                <button
                  key={s.id}
                  type="button"
                  tabIndex={matched ? 0 : -1}
                  aria-hidden={matched ? undefined : true}
                  onClick={() => onSelect(s.id)}
                  style={{
                    // Non-matching rows smoothly collapse rather than vanish.
                    maxHeight: matched ? 64 : 0,
                    opacity: matched ? 1 : 0,
                    paddingBlock: matched ? 8 : 0,
                    marginBottom: matched ? 4 : 0,
                    pointerEvents: matched ? 'auto' : 'none',
                    overflow: 'hidden',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    paddingInline: 8,
                    textAlign: 'start',
                    cursor: 'pointer',
                    borderRadius: T.radiusSm,
                    border: `1.5px solid ${active ? T.neon : 'transparent'}`,
                    background: active ? 'color-mix(in oklab, #00f6ff 12%, transparent)' : 'transparent',
                    boxShadow: active ? `0 0 12px -3px ${T.neon}` : 'none',
                    transition:
                      'max-height 220ms ease, opacity 200ms ease, padding 220ms ease, margin 220ms ease, border-color 150ms ease, background 150ms ease',
                  }}
                >
                  <OutlineAvatar name={s.name} size={32} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: active ? T.neon : T.text,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {s.name}
                    </span>
                    {s.subjectNames.length > 0 && (
                      <span
                        style={{
                          display: 'block',
                          fontSize: 11.5,
                          color: T.text3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {s.subjectNames.join(' · ')}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
            {matchedIds.size === 0 && (
              <p style={{ textAlign: 'center', fontSize: 12.5, color: T.text3, padding: '12px 8px' }}>
                אין תוצאות (No results)
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
