import { Sparkles, ArrowLeft } from 'lucide-react';
import { towTokens as T } from '../../../design/tokens';
import { BentoTile } from '../../teacher/components/BentoGrid';

export function FindTutorTile({ onFindTutor }: { onFindTutor: () => void }) {
  return (
    <BentoTile size="1x2" style={{ borderColor: T.orange, background: 'color-mix(in oklab, #fc6d17 22%, transparent)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: T.orange, display: 'flex' }}><Sparkles size={18} /></span>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: T.text }}>
            מצא לי מורה חדש<span style={{ color: T.text3, fontWeight: 600 }}> (Find Tutor)</span>
          </h3>
        </header>
        <p style={{ margin: 0, fontSize: 13.5, color: T.text2, lineHeight: 1.5 }}>
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
            borderRadius: T.radiusSm,
            border: 'none',
            background: T.orange,
            color: '#1a0b03',
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
    </BentoTile>
  );
}
