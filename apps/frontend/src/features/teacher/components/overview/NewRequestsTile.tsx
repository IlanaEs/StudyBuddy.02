import { useEffect, useState } from 'react';
import { Inbox, ArrowLeft } from 'lucide-react';
import { towTokens as T } from '../../../../design/tokens';
import { BentoTile } from '../BentoGrid';
import { useTeacherDashboardStore } from '../../store/teacherDashboardStore';

export function NewRequestsTile() {
  const requests = useTeacherDashboardStore((s) => s.requests);
  const setActiveTab = useTeacherDashboardStore((s) => s.setActiveTab);
  const count = requests.filter((r) => r.status === 'pending').length;

  const [jiggle, setJiggle] = useState(false);
  const [hover, setHover] = useState(false);

  // Subtle jiggle every 5s while there are pending requests.
  useEffect(() => {
    if (count === 0) return;
    const id = setInterval(() => {
      setJiggle(true);
      setTimeout(() => setJiggle(false), 550);
    }, 5000);
    return () => clearInterval(id);
  }, [count]);

  return (
    <BentoTile size="1x2" title="בקשות חדשות" english="New Requests" icon={<Inbox size={16} />}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, flex: 1, justifyContent: 'center' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: T.fontMono, fontSize: 48, fontWeight: 800, color: count > 0 ? T.neon : T.text3, lineHeight: 1 }}>
            {count}
          </div>
          {count > 0 && (
            <span
              className={jiggle ? 'tow-jiggle' : undefined}
              style={{
                position: 'absolute',
                top: -6,
                insetInlineEnd: -14,
                minWidth: 18,
                height: 18,
                padding: '0 5px',
                borderRadius: 999,
                background: T.gold,
                color: '#1a1405',
                fontSize: 11,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {count}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: T.text2 }}>
          {count > 0 ? 'בקשות שיעור ממתינות לאישורך' : 'אין בקשות חדשות'}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setActiveTab('calendar')}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: hover ? 12 : 8,
          padding: '11px 16px',
          borderRadius: T.radiusSm,
          border: `1.5px solid ${T.neon}`,
          background: 'color-mix(in oklab, #00f6ff 12%, transparent)',
          color: T.neon,
          fontSize: 13.5,
          fontWeight: 800,
          cursor: 'pointer',
          transition: 'gap 180ms ease',
        }}
      >
        <ArrowLeft size={16} style={{ transform: hover ? 'translateX(-4px)' : 'none', transition: 'transform 180ms ease' }} />
        לצפייה בבקשות (View Requests)
      </button>
    </BentoTile>
  );
}
