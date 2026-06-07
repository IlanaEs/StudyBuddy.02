import { Sparkles, ArrowLeft } from 'lucide-react';
import { BentoCard, sbTokens as sb } from '../../../design-system';

export function FindTutorTile({ onFindTutor }: { onFindTutor: () => void }) {
  return (
    <BentoCard
      colSpan={1}
      rowSpan={2}
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderColor: sb.warning,
        background: 'color-mix(in oklab, var(--sb-warning) 22%, transparent)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: sb.warning, display: 'flex' }}><Sparkles size={18} /></span>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: sb.textPrimary }}>
            מצא לי מורה חדש<span style={{ color: sb.textMuted, fontWeight: 600 }}> (Find Tutor)</span>
          </h3>
        </header>
        <p style={{ margin: 0, fontSize: 13.5, color: sb.textSecondary, lineHeight: 1.5 }}>
          צריך עזרה במקצוע נוסף? נמצא עבורך התאמה.
        </p>
        <button
          type="button"
          onClick={onFindTutor}
          style={{
            marginTop: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '12px 16px',
            borderRadius: sb.radiusSmall,
            border: 'none',
            background: sb.warning,
            color: sb.onPrimary,
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'transform 250ms ease-out, filter 250ms ease-out',
          }}
        >
          התחל התאמה
          <ArrowLeft size={16} />
        </button>
      </div>
    </BentoCard>
  );
}
