import type { ReactNode } from 'react';
import { Bell, LayoutDashboard, CalendarClock, History, MessageCircle, Settings, LogOut } from 'lucide-react';
import { FloatingTopNavbar, type NavTab } from '../../../design-system';
import { towTokens as T } from '../../../design/tokens';
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
    <div dir="rtl" lang="he" className="tow tow-bg-glow" style={{ minHeight: '100dvh', color: T.text }}>
      <FloatingTopNavbar tabs={tabs} />
      {/* Bottom padding clears the fixed bottom-right SessionControls widget so no card
          (e.g. the "Full History" button) is occluded by it. */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'calc(1.5rem + 64px) 18px 96px' }}>
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
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: T.neon }}>
              דשבורד תלמיד (Student Dashboard)
            </p>
            <h1
              style={{
                margin: '4px 0 0',
                fontSize: 'clamp(18px, 3.2vw, 24px)',
                fontWeight: 800,
                color: T.text,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              שלום, {studentName}
            </h1>
          </div>

          {/* Notification bell — present but inert (Notifications not built yet). */}
          <button type="button" disabled aria-disabled="true" aria-label="התראות" title="בקרוב" style={iconButtonStyle(true)}>
            <Bell size={20} />
          </button>
        </header>

        <main style={{ minWidth: 0 }}>{children}</main>
      </div>
    </div>
  );
}

function iconButtonStyle(inert: boolean) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 42,
    height: 42,
    flexShrink: 0,
    borderRadius: T.radiusSm,
    border: `1px solid ${T.ink}`,
    background: 'color-mix(in oklab, #3f7e76 40%, transparent)',
    color: inert ? T.text3 : T.text,
    cursor: inert ? 'not-allowed' : 'pointer',
    opacity: inert ? 0.6 : 1,
  } as const;
}
