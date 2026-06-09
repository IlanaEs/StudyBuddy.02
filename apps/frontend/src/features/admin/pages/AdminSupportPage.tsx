import { useState } from 'react';
import { CircleDot, Clock, CheckCircle2, Archive, LifeBuoy } from 'lucide-react';

import { sbTokens as sb } from '../../../design/tokens';
import { AdminDashboardLayout } from '../components/AdminDashboardLayout';

// Support & Tickets — future-ready scaffold. No backend yet: all counts are 0
// and the queue is empty (honest real-or-empty), but the page communicates the
// intended operational structure (status pipeline, source split, queue columns).

type SourceKey = 'learners' | 'teachers' | 'platform';

const SOURCES: { key: SourceKey; labelHe: string; labelEn: string }[] = [
  { key: 'learners', labelHe: 'תלמידים / הורים', labelEn: 'Student / Parent' },
  { key: 'teachers', labelHe: 'מורים', labelEn: 'Teacher' },
  { key: 'platform', labelHe: 'טכני / פלטפורמה', labelEn: 'Technical / Platform' },
];

const STATUS_CARDS: { labelHe: string; labelEn: string; color: string; icon: typeof CircleDot }[] = [
  { labelHe: 'פתוח', labelEn: 'Open', color: sb.active, icon: CircleDot },
  { labelHe: 'בטיפול', labelEn: 'In Progress', color: sb.warning, icon: Clock },
  { labelHe: 'נפתר', labelEn: 'Resolved', color: sb.success, icon: CheckCircle2 },
  { labelHe: 'סגור', labelEn: 'Closed', color: sb.textMuted, icon: Archive },
];

const QUEUE_COLUMNS = [
  'עדיפות (Priority)',
  'סוג פנייה (Ticket Type)',
  'משתמש (User)',
  'קשור ל (Related)',
  'סטטוס (Status)',
  'נוצר (Created At)',
  'עודכן (Last Updated)',
];

export function AdminSupportPage() {
  const [source, setSource] = useState<SourceKey>('learners');

  return (
    <AdminDashboardLayout>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: sb.textPrimary, fontFamily: sb.fontUi }}>
          תמיכה ופניות <span style={{ color: sb.textMuted, fontWeight: 600, fontSize: 15 }}>(Support & Tickets)</span>
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13.5, color: sb.textSecondary, lineHeight: 1.6 }}>
          מעקב אחר תלונות משתמשים, תקלות טכניות, מחלוקות על שיעורים ובקשות תמיכה כלליות.
        </p>
      </header>

      {/* Status pipeline summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 22 }}>
        {STATUS_CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.labelEn} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, background: sb.glassBase, border: `1px solid ${sb.borderCyber}`, borderRadius: sb.radiusCard }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon size={16} style={{ color: c.color }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: sb.textSecondary }}>
                  {c.labelHe} <span style={{ color: sb.textMuted, fontSize: 11 }}>({c.labelEn})</span>
                </span>
              </div>
              <span style={{ fontFamily: sb.fontMono, fontSize: 28, fontWeight: 800, color: sb.textPrimary }}>0</span>
            </div>
          );
        })}
      </div>

      {/* Source split — segmented control */}
      <div role="tablist" style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {SOURCES.map((s) => {
          const active = s.key === source;
          return (
            <button
              key={s.key}
              role="tab"
              aria-selected={active}
              onClick={() => setSource(s.key)}
              style={{
                padding: '8px 16px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                fontFamily: sb.fontUi,
                color: active ? sb.textPrimary : sb.textSecondary,
                background: active ? sb.hoverGlow : 'transparent',
                border: `1px solid ${active ? sb.borderCyber : 'transparent'}`,
                cursor: 'pointer',
              }}
            >
              {s.labelHe} <span style={{ color: sb.textMuted, fontWeight: 500, fontSize: 11 }}>({s.labelEn})</span>
            </button>
          );
        })}
      </div>

      {/* Ticket queue — structure visible, empty state inside */}
      <div style={{ background: sb.glassBase, border: `1px solid ${sb.borderCyber}`, borderRadius: sb.radiusCard, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {QUEUE_COLUMNS.map((h) => (
                  <th key={h} style={{ textAlign: 'right', padding: '10px 14px', fontSize: 11.5, fontWeight: 700, color: sb.textMuted, borderBottom: `1px solid ${sb.borderCyber}`, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={QUEUE_COLUMNS.length} style={{ padding: '48px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
                    <LifeBuoy size={32} style={{ color: sb.textMuted }} />
                    <span style={{ fontSize: 16, fontWeight: 800, color: sb.textPrimary }}>אין פניות פתוחות כרגע</span>
                    <span style={{ fontSize: 13, color: sb.textSecondary }}>All support queues are clear.</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </AdminDashboardLayout>
  );
}
