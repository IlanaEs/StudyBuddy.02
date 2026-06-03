import { Power, Snowflake } from 'lucide-react';
import { towTokens as T } from '../../../../design/tokens';
import { BentoTile } from '../BentoGrid';
import { useTeacherDashboardStore } from '../../store/teacherDashboardStore';

const TRACK_W = 168;
const TRACK_H = 60;
const KNOB = 52;
const PAD = 4;

/** סטטוס (Status) cube — the Kill Switch. Active=right/green (+halo); frozen=left/red. */
export function StatusCard() {
  const config = useTeacherDashboardStore((s) => s.config);
  const setFrozen = useTeacherDashboardStore((s) => s.setFrozen);
  if (!config) return null;

  const active = !config.isFrozen; // active = not frozen

  return (
    <BentoTile
      size="1x1"
      title="סטטוס"
      english="Status"
      icon={<Power size={16} />}
      // Weak green glow halo behind the cube while active; off when frozen.
      style={{
        boxShadow: active
          ? `0 0 28px -6px color-mix(in oklab, ${T.success} 45%, transparent), 0 8px 28px -18px rgba(0,0,0,0.55)`
          : '0 8px 28px -18px rgba(0,0,0,0.55)',
        transition: 'box-shadow 360ms ease',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingTop: 6 }}>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label="סטטוס פרופיל (Profile status)"
          onClick={() => setFrozen(active)}
          dir="ltr"
          style={{
            position: 'relative',
            width: TRACK_W,
            height: TRACK_H,
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            background: active
              ? 'linear-gradient(90deg, #9fc92f, #bbe341)'
              : 'linear-gradient(90deg, #e22b57, #b51f45)',
            boxShadow: active
              ? `inset 0 0 0 1px color-mix(in oklab, ${T.success} 60%, transparent)`
              : `inset 0 0 0 1px color-mix(in oklab, ${T.alert} 60%, transparent)`,
            transition: 'background 320ms ease, box-shadow 320ms ease',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: PAD,
              left: active ? TRACK_W - KNOB - PAD : PAD,
              width: KNOB,
              height: KNOB,
              borderRadius: 999,
              background: '#0a1414',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: active ? T.success : T.alert,
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              transition: 'left 320ms cubic-bezier(0.2,0.8,0.2,1), color 320ms ease',
            }}
          >
            {active ? <Power size={22} /> : <Snowflake size={22} />}
          </span>
        </button>

        <span style={{ fontFamily: T.fontMono, fontSize: 13, fontWeight: 800, color: active ? T.success : T.alert }}>
          {active ? 'פעיל (Active)' : 'מוקפא (Frozen)'}
        </span>

        {/* Sharp fade-in explanation when frozen (Hebrew-only body copy). */}
        {!active && (
          <p
            className="tow-step-in"
            style={{ margin: 0, textAlign: 'center', fontSize: 12.5, lineHeight: 1.6, color: T.text2 }}
          >
            <Snowflake size={13} style={{ color: T.alert, verticalAlign: 'middle', marginInlineEnd: 4 }} />
            הפרופיל שלך מוקפא זמנית לבקשתך. לא תקבל בקשות חדשות עד להפעלה מחדש.
          </p>
        )}
      </div>
    </BentoTile>
  );
}
