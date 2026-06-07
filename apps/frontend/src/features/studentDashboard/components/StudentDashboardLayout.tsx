import { useState } from 'react';
import type { ReactNode } from 'react';
import { Bell, Menu, X } from 'lucide-react';
import { useMediaQuery } from '@mantine/hooks';
import { towTokens as T } from '../../../design/tokens';
import { StudentSidebar } from './StudentSidebar';
import type { StudentView } from './StudentSidebar';

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
  // Default to mobile when the query is still resolving (SSR-safe-ish): treat
  // undefined as desktop so the anchored rail is the baseline.
  const isMobile = useMediaQuery('(max-width: 860px)') ?? false;
  const [drawerOpen, setDrawerOpen] = useState(false);

  // On mobile, selecting an item should also close the drawer.
  const selectView = (view: StudentView) => {
    onSelectView(view);
    setDrawerOpen(false);
  };
  const signOut = () => {
    setDrawerOpen(false);
    onSignOut();
  };

  return (
    <div dir="rtl" lang="he" className="tow tow-bg-glow" style={{ minHeight: '100dvh', color: T.text }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 18px 56px' }}>
        {/* Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {isMobile && (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="פתח תפריט"
                style={{ ...iconButtonStyle(false), width: 44, height: 44 }}
              >
                <Menu size={20} />
              </button>
            )}
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
          </div>

          {/* Notification bell — present but inert (Notifications not built yet). */}
          <button type="button" disabled aria-disabled="true" aria-label="התראות" title="בקרוב" style={iconButtonStyle(true)}>
            <Bell size={20} />
          </button>
        </header>

        {/* Sidebar + main */}
        {isMobile ? (
          <>
            <main style={{ minWidth: 0 }}>{children}</main>
            {drawerOpen && (
              <>
                {/* Backdrop */}
                <div
                  onClick={() => setDrawerOpen(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(4,22,21,0.6)', backdropFilter: 'blur(2px)' }}
                />
                {/* Drawer — anchored to the right (RTL start). */}
                <div
                  role="dialog"
                  aria-label="תפריט ניווט"
                  style={{
                    position: 'fixed',
                    insetBlock: 0,
                    insetInlineStart: 0,
                    zIndex: 91,
                    width: 'min(280px, 82vw)',
                    padding: 14,
                    background: T.bg,
                    borderInlineStart: `1px solid ${T.card}`,
                    boxShadow: '0 0 60px -20px rgba(0,0,0,0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <button type="button" onClick={() => setDrawerOpen(false)} aria-label="סגור תפריט" style={{ ...iconButtonStyle(false), width: 44, height: 44 }}>
                      <X size={20} />
                    </button>
                  </div>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <StudentSidebar active={activeView} onSelect={selectView} onSignOut={signOut} />
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(210px, 240px) 1fr', gap: 20, alignItems: 'stretch' }}>
            <div style={{ position: 'sticky', top: 20, alignSelf: 'start' }}>
              <StudentSidebar active={activeView} onSelect={selectView} onSignOut={signOut} />
            </div>
            <main style={{ minWidth: 0 }}>{children}</main>
          </div>
        )}
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
