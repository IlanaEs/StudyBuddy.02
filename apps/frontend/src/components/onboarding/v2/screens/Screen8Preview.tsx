import { useRef } from 'react';
import type { TeacherOnboardingData } from '../../../../pages/TeacherOnboardingPage';
import { TeacherPreviewCard } from '../../TeacherPreviewCard';
import { towTokens as T } from '../../../../design/tokens';
import { ScreenHeader } from '../primitives';

interface Screen8Props {
  data: TeacherOnboardingData;
  onActivate: () => void;
  completionError: string | null;
}

/**
 * Screen 8 — Teacher Profile Preview (תצוגה מקדימה והפעלה). The mock tutor card
 * with a subtle 3D mouse-tilt and a full-width pulsing activate button.
 */
export function Screen8Preview({ data, onActivate, completionError }: Screen8Props) {
  const tiltRef = useRef<HTMLDivElement>(null);

  function handleMove(e: React.MouseEvent) {
    const el = tiltRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${px * 6}deg) rotateX(${-py * 6}deg)`;
  }
  function reset() {
    if (tiltRef.current) tiltRef.current.style.transform = 'perspective(900px) rotateY(0) rotateX(0)';
  }

  return (
    <div className="tow-step-in">
      <ScreenHeader title="כך תיראה הכרטיסייה שלך" english="Profile Preview" subtitle="זה מה שתלמידים יראו כשתופיע/י בתוצאות ההתאמה." />

      {completionError && (
        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: T.radiusSm, border: `2px solid ${T.alert}`, background: 'rgba(226,43,87,0.10)', color: T.alert, fontSize: 13, fontWeight: 600 }}>
          {completionError}
        </div>
      )}

      <div
        ref={tiltRef}
        onMouseMove={handleMove}
        onMouseLeave={reset}
        style={{ transition: 'transform 200ms ease', transformStyle: 'preserve-3d' }}
      >
        <TeacherPreviewCard data={data} />
      </div>

      <button
        type="button"
        onClick={onActivate}
        className="tow-pulse-cta"
        style={{
          width: '100%', marginTop: 22, padding: '16px 20px', borderRadius: 'var(--tow-radius-sm)',
          border: 'none', background: T.orange, color: '#1a0e05', fontSize: 16, fontWeight: 800,
          cursor: 'pointer', fontFamily: 'var(--tow-font)',
        }}
      >
        כניסה לדשבורד (Enter Dashboard)
      </button>
    </div>
  );
}
