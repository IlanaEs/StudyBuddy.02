import { useState } from 'react';

import { sbTokens as sb } from '../../../design/tokens';
import { AdminDashboardLayout } from '../components/AdminDashboardLayout';
import { TeacherApprovalsTab } from '../components/TeacherApprovalsTab';
import { ContentApprovalsTab } from '../components/ContentApprovalsTab';

type SubTab = 'teachers' | 'content';

const SUB_TABS: { key: SubTab; labelHe: string; labelEn: string }[] = [
  { key: 'teachers', labelHe: 'אישורי מורים', labelEn: 'Teacher Approvals' },
  { key: 'content', labelHe: 'אישורי תוכן', labelEn: 'Content Approvals' },
];

export function AdminApprovalsPage() {
  const [tab, setTab] = useState<SubTab>('teachers');

  return (
    <AdminDashboardLayout>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: sb.textPrimary, fontFamily: sb.fontUi }}>
          אישורים <span style={{ color: sb.textMuted, fontWeight: 600, fontSize: 15 }}>(Approvals)</span>
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13.5, color: sb.textSecondary, lineHeight: 1.6 }}>
          אישור מורים חדשים ותוכן שהוגש על־ידי משתמשים לפני הצגתם במערכת.
        </p>
      </header>

      <div role="tablist" style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {SUB_TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              style={{
                padding: '8px 16px',
                borderRadius: 999,
                fontSize: 13.5,
                fontWeight: active ? 700 : 500,
                fontFamily: sb.fontUi,
                color: active ? sb.textPrimary : sb.textSecondary,
                background: active ? sb.hoverGlow : 'transparent',
                border: `1px solid ${active ? sb.borderCyber : 'transparent'}`,
                cursor: 'pointer',
              }}
            >
              {t.labelHe} <span style={{ color: sb.textMuted, fontWeight: 500, fontSize: 11.5 }}>({t.labelEn})</span>
            </button>
          );
        })}
      </div>

      {tab === 'teachers' && <TeacherApprovalsTab />}
      {tab === 'content' && <ContentApprovalsTab />}
    </AdminDashboardLayout>
  );
}
