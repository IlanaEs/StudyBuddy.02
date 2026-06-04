import { Clock, ArrowLeft } from 'lucide-react';
import { towTokens as T } from '../../../design/tokens';
import { BentoTile } from '../../teacher/components/BentoGrid';
import { minutesToHours } from './formatters';
import type { StudentDashboardPayload } from '../api/types';

export function MonthlyActivityTile({
  activity,
  onFullHistory,
}: {
  activity: StudentDashboardPayload['monthly_activity'];
  onFullHistory: () => void;
}) {
  return (
    <BentoTile size="1x2" title="פעילות החודש" english="Monthly Activity" icon={<Clock size={18} />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 46, fontWeight: 800, color: T.neon, fontFamily: T.fontMono, lineHeight: 1 }}>
            {minutesToHours(activity.total_minutes)}
          </span>
          <span style={{ fontSize: 15, color: T.text2, fontWeight: 700 }}>שעות לימוד</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: T.text3 }}>סך השעות שצברת החודש</p>

        <button
          type="button"
          onClick={onFullHistory}
          style={{
            marginTop: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            alignSelf: 'flex-start',
            padding: '8px 12px',
            borderRadius: T.radiusSm,
            border: `1px solid ${T.ink}`,
            background: 'color-mix(in oklab, #3f7e76 40%, transparent)',
            color: T.text,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background 250ms ease-out',
          }}
        >
          היסטוריית שיעורים מלאה (Full History)
          <ArrowLeft size={15} />
        </button>
      </div>
    </BentoTile>
  );
}
