import { FileText, BookOpen } from 'lucide-react';
import { towTokens as T } from '../../../design/tokens';
import { BentoTile } from '../../teacher/components/BentoGrid';
import { EmptyState } from '../../teacher/components/EmptyState';
import { formatDate } from './formatters';
import type { StudentDashboardPayload } from '../api/types';

export function RecentMaterialsTile({
  materials,
}: {
  materials: StudentDashboardPayload['recent_materials'];
}) {
  return (
    <BentoTile size="1x2" title="חומרי למידה אחרונים" english="Recent Materials" icon={<FileText size={18} />}>
      {!materials ? (
        <EmptyState icon={<FileText size={24} />} message="אין סיכומים עדיין" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          <div style={{ fontSize: 12.5, color: T.text3 }}>
            {materials.teacher_name}
            {materials.lesson_at ? ` · ${formatDate(materials.lesson_at)}` : ''}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              lineHeight: 1.5,
              color: T.text,
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {materials.shared_summary ?? 'הסיכום יתעדכן בקרוב'}
          </p>

          {materials.open_homework_count > 0 && (
            <div
              style={{
                marginTop: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                alignSelf: 'flex-start',
                padding: '6px 10px',
                borderRadius: T.radiusSm,
                background: 'color-mix(in oklab, #ffd166 16%, transparent)',
                color: T.gold,
                fontSize: 12.5,
                fontWeight: 700,
              }}
            >
              <BookOpen size={14} />
              {materials.open_homework_count} משימות פתוחות
            </div>
          )}
        </div>
      )}
    </BentoTile>
  );
}
