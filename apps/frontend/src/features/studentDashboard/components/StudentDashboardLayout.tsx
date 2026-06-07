import type { ReactNode } from 'react';
import { Bell, LayoutDashboard, CalendarClock, History, MessageCircle, Settings, LogOut } from 'lucide-react';
import { AppShell, FloatingTopNavbar, RoleBadge, sbTokens as sb, type NavTab } from '../../../design-system';
import type { StudentView } from '../types';

export function StudentDashboardLayout({
  studentName,
  activeView,
  onSelectView,
  onSignOut,
  children,
}: {
  studentName: string;
  activeView: StudentView;
  onSelectView: (view: StudentView) => void;
  onSignOut: () => void;
  children: ReactNode;
}) {
  // Clean, text-free floating bar: ALL nav items as icons (tooltips on hover). RTL →
  // overview rightmost, sign-out leftmost. Bilingual-rule exception: icons only.
  const tabs: NavTab[] = [
    { id: 'overview', icon: <LayoutDashboard size={20} />, label: 'תצוגה כללית', active: activeView === 'overview', onClick: () => onSelectView('overview') },
    { id: 'lessons', icon: <CalendarClock size={20} />, label: 'השיעורים שלי', active: activeView === 'lessons', onClick: () => onSelectView('lessons') },
    { id: 'history', icon: <History size={20} />, label: 'היסטוריה וסיכומים', active: activeView === 'history', onClick: () => onSelectView('history') },
    { id: 'chat', icon: <MessageCircle size={20} />, label: 'הצ׳אטים שלי (בקרוב)', disabled: true },
    { id: 'settings', icon: <Settings size={20} />, label: 'פרופיל / הגדרות', active: activeView === 'settings', onClick: () => onSelectView('settings') },
    { id: 'signout', icon: <LogOut size={20} />, label: 'התנתקות', onClick: onSignOut },
  ];

  return (
    <AppShell
      navbar={<FloatingTopNavbar tabs={tabs} activeIndicator="underline" />}
      maxWidth={1280}
    >
      {/* Greeting header (identity, not nav) — sits below the floating bar. */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: sb.active }}>
              דשבורד תלמיד (Student Dashboard)
            </p>
            <RoleBadge role="student" />
          </div>
          <h1
            style={{
              margin: '4px 0 0',
              fontSize: 'clamp(18px, 3.2vw, 24px)',
              fontWeight: 800,
              color: sb.textPrimary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            שלום, {studentName}
          </h1>
        </div>

        {/* Notification bell — present but inert (Notifications not built yet). */}
        <button type="button" disabled aria-disabled="true" aria-label="התראות" title="בקרוב" style={bellButtonStyle}>
          <Bell size={20} />
        </button>
      </header>

      <main style={{ minWidth: 0 }}>{children}</main>

      {/* Clears the fixed bottom-right SessionControls widget (AppShell pads 64px;
          this spacer brings total bottom clearance to ~96px). */}
      <div aria-hidden style={{ height: 32 }} />
    </AppShell>
  );
}

const bellButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 42,
  height: 42,
  flexShrink: 0,
  borderRadius: sb.radiusSmall,
  border: `1px solid ${sb.borderCyber}`,
  background: sb.glassSoft,
  color: sb.textMuted,
  cursor: 'not-allowed',
  opacity: 0.6,
} as const;
