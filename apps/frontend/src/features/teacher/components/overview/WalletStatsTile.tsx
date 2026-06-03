import { useEffect, useRef, useState } from 'react';
import { Wallet, Clock } from 'lucide-react';
import { towTokens as T } from '../../../../design/tokens';
import { BentoTile } from '../BentoGrid';
import { useTeacherDashboardStore } from '../../store/teacherDashboardStore';

const WEEKS_PER_MONTH = 4.3;

export function WalletStatsTile() {
  const config = useTeacherDashboardStore((s) => s.config);
  const lessons = useTeacherDashboardStore((s) => s.lessons);

  // Expected monthly income estimated from seeded config (rate × weekly hours).
  const target = Math.round((config?.hourlyRate ?? 0) * (config?.weeklyTeachingHours ?? 0) * WEEKS_PER_MONTH);
  // Pending-payment count is a proxy (completed lessons) until a payments model lands.
  const pendingPayments = lessons.filter((l) => l.status === 'completed').length;

  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  // Odometer count-up from 0 on load (view-state only).
  useEffect(() => {
    if (target <= 0) { setDisplay(0); return; }
    const duration = 900;
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(target * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target]);

  return (
    <BentoTile size="1x1" title="ארנק וסטטיסטיקה" english="Wallet & Stats" icon={<Wallet size={16} />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, color: T.text3 }}>הכנסה חודשית צפויה</span>
        <span style={{ fontFamily: T.fontMono, fontSize: 30, fontWeight: 800, color: T.neon, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          ₪{display.toLocaleString('he-IL')}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto' }}>
        <Clock size={14} style={{ color: T.gold }} />
        <span style={{ fontFamily: T.fontMono, fontSize: 14, fontWeight: 700, color: T.gold }}>{pendingPayments}</span>
        <span style={{ fontSize: 12, color: T.text3 }}>ממתינים לתשלום</span>
      </div>
    </BentoTile>
  );
}
