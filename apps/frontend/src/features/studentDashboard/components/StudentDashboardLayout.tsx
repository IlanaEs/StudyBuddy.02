import type { ReactNode } from 'react';
import { Bell } from 'lucide-react';
import { towTokens as T } from '../../../design/tokens';
import { StudentSidebar } from './StudentSidebar';
import type { StudentView } from './StudentSidebar';

export function StudentDashboardLayout({
  studentName,
  activeView,
  onSelectView,
  children,
}: {
  studentName: string;
  activeView: StudentView;
  onSelectView: (view: StudentView) => void;
  children: ReactNode;
}) {
  return (
    <div dir="rtl" lang="he" className="tow tow-bg-glow" style={{ minHeight: '100dvh', color: T.text }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px 64px' }}>
        {/* Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 22,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: T.neon }}>
              לוח בקרה (Dashboard)
            </p>
            <h1 style={{ margin: '4px 0 0', fontSize: 'clamp(20px, 3.4vw, 26px)', fontWeight: 800, color: T.text }}>
              שלום, {studentName}
            </h1>
          </div>

          {/* Notification bell — present but inert (Notifications are P2). */}
          <button
            type="button"
            disabled
            aria-disabled="true"
            aria-label="התראות"
            title="בקרוב"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 42,
              height: 42,
              borderRadius: T.radiusSm,
              border: `1px solid ${T.ink}`,
              background: 'color-mix(in oklab, #3f7e76 40%, transparent)',
              color: T.text3,
              cursor: 'not-allowed',
              opacity: 0.6,
            }}
          >
            <Bell size={20} />
          </button>
        </header>

        {/* Sidebar + main */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(200px, 240px) 1fr',
            gap: 20,
            alignItems: 'start',
          }}
        >
          <StudentSidebar active={activeView} onSelect={onSelectView} />
          <main style={{ minWidth: 0 }}>{children}</main>
        </div>
      </div>
    </div>
  );
}
