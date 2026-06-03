import { useState } from 'react';
import { UserCircle2, FileText, FolderOpen, ClipboardList, Wallet, type LucideIcon } from 'lucide-react';
import { towTokens as T } from '../../../../design/tokens';
import { useTeacherDashboardStore } from '../../store/teacherDashboardStore';
import { studentOpenDebt } from '../../utils/ledger';
import type { DashboardStudent } from '../../types/teacherDashboard.types';
import { OutlineAvatar } from '../OutlineAvatar';
import { EmptyState } from '../EmptyState';
import { glassSurface } from './surface';
import { ProfileBriefPanel } from './panels/ProfileBriefPanel';
import { MaterialsPanel } from './panels/MaterialsPanel';
import { TasksPanel } from './panels/TasksPanel';
import { AccountStatusPanel } from './panels/AccountStatusPanel';

type InnerTab = 'profile' | 'materials' | 'tasks' | 'account';

const INNER_TABS: { id: InnerTab; label: string; english: string; icon: LucideIcon }[] = [
  { id: 'profile', label: 'פרופיל ובריף', english: 'Profile & Brief', icon: FileText },
  { id: 'materials', label: 'היסטוריית למידה וחומרים', english: 'Learning History & Materials', icon: FolderOpen },
  { id: 'tasks', label: 'משימות ושיעורי בית', english: 'Tasks & Homework', icon: ClipboardList },
  { id: 'account', label: 'מצב חשבון', english: 'Account Status', icon: Wallet },
];

export function StudentFile({ student }: { student: DashboardStudent | null }) {
  const [tab, setTab] = useState<InnerTab>('profile');
  const ledgerEntries = useTeacherDashboardStore((s) => s.ledgerEntries);

  if (!student) {
    return (
      <section style={glassSurface}>
        <div style={{ flex: 1, display: 'flex', padding: 24 }}>
          <EmptyState icon={<UserCircle2 size={28} />} message="בחרו תלמיד כדי לצפות בתיק." />
        </div>
      </section>
    );
  }

  const debt = studentOpenDebt(ledgerEntries, student.id);

  return (
    <section style={glassSurface}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 18px 14px',
          borderBottom: `1px solid ${T.line}`,
        }}
      >
        <OutlineAvatar name={student.name} size={42} />
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text }}>{student.name}</h2>
          {student.subjectNames.length > 0 && (
            <span style={{ fontSize: 12.5, color: T.text3 }}>{student.subjectNames.join(' · ')}</span>
          )}
        </div>
      </header>

      <nav
        aria-label="ניווט תיק תלמיד (Student file navigation)"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px 18px' }}
      >
        {INNER_TABS.map((it) => {
          const Icon = it.icon;
          const active = it.id === tab;
          const showDebt = it.id === 'account' && debt > 0;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => setTab(it.id)}
              aria-current={active ? 'page' : undefined}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 12px',
                borderRadius: T.radiusSm,
                border: `1.5px solid ${active ? T.neon : T.ink}`,
                background: active
                  ? 'color-mix(in oklab, #00f6ff 14%, transparent)'
                  : 'color-mix(in oklab, #3f7e76 40%, transparent)',
                color: active ? T.neon : T.text2,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: active ? `0 0 12px -2px ${T.neon}` : 'none',
                transition: 'border-color 150ms ease, color 150ms ease, background 150ms ease',
              }}
            >
              <Icon size={15} />
              {it.label} <span style={{ opacity: 0.75, fontWeight: 600 }}>({it.english})</span>
              {showDebt && (
                <span
                  style={{
                    marginInlineStart: 4,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: T.alert,
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 800,
                    fontFamily: T.fontMono,
                    whiteSpace: 'nowrap',
                  }}
                >
                  חוב: ₪{debt.toLocaleString('he-IL')} (Debt)
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 18px 20px' }}>
        {tab === 'profile' && <ProfileBriefPanel studentId={student.id} />}
        {tab === 'materials' && <MaterialsPanel studentId={student.id} />}
        {tab === 'tasks' && <TasksPanel studentId={student.id} />}
        {tab === 'account' && <AccountStatusPanel studentId={student.id} />}
      </div>
    </section>
  );
}
