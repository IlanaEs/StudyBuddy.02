import { Clock, ArrowLeft } from 'lucide-react';
import { BentoCard, sbTokens as sb } from '../../../design-system';
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
    <BentoCard
      colSpan={1}
      rowSpan={2}
      title="פעילות החודש"
      english="Monthly Activity"
      icon={<Clock size={18} />}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 46, fontWeight: 800, color: sb.active, fontFamily: sb.fontMono, lineHeight: 1 }}>
            {minutesToHours(activity.total_minutes)}
          </span>
          <span style={{ fontSize: 15, color: sb.textSecondary, fontWeight: 700 }}>שעות לימוד</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: sb.textMuted }}>סך השעות שצברת החודש</p>

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
            borderRadius: sb.radiusSmall,
            border: `1px solid ${sb.borderCyber}`,
            background: sb.glassBase,
            color: sb.textPrimary,
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
    </BentoCard>
  );
}
