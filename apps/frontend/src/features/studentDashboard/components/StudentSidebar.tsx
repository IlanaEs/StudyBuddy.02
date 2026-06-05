import type { ReactNode } from 'react';
import { LayoutDashboard, CalendarClock, History, MessageCircle, Settings, LogOut } from 'lucide-react';
import { towTokens as T } from '../../../design/tokens';

export type StudentView = 'overview' | 'lessons' | 'history' | 'settings';

type NavItem = {
  view: StudentView;
  label: string;
  english: string;
  icon: ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  { view: 'overview', label: 'תצוגה כללית', english: 'Overview', icon: <LayoutDashboard size={18} /> },
  { view: 'lessons', label: 'השיעורים שלי', english: 'My Lessons', icon: <CalendarClock size={18} /> },
  { view: 'history', label: 'היסטוריה וסיכומים', english: 'History & Notes', icon: <History size={18} /> },
];

const ITEM_BASE = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '11px 14px',
  borderRadius: T.radiusSm,
  fontSize: 14,
  fontWeight: 700,
  textAlign: 'right',
  width: '100%',
  transition: 'border-color 250ms ease-out, color 250ms ease-out, background 250ms ease-out',
} as const;

export function StudentSidebar({
  active,
  onSelect,
  onSignOut,
}: {
  active: StudentView;
  onSelect: (view: StudentView) => void;
  onSignOut: () => void;
}) {
  return (
    <nav
      aria-label="ניווט ראשי"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 14,
        borderRadius: T.radius,
        border: `1px solid ${T.card}`,
        background: 'color-mix(in oklab, #3f7e76 38%, transparent)',
        backdropFilter: 'blur(10px) saturate(130%)',
        WebkitBackdropFilter: 'blur(10px) saturate(130%)',
        height: '100%',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = item.view === active;
        return (
          <button
            key={item.view}
            type="button"
            onClick={() => onSelect(item.view)}
            style={{
              ...ITEM_BASE,
              border: `1.5px solid ${isActive ? T.neon : 'transparent'}`,
              background: isActive ? 'color-mix(in oklab, #00f6ff 14%, transparent)' : 'transparent',
              color: isActive ? T.neon : T.text2,
              cursor: 'pointer',
              boxShadow: isActive ? `0 0 12px -2px ${T.neon}` : 'none',
            }}
          >
            <span style={{ display: 'flex' }}>{item.icon}</span>
            <span>
              {item.label}
              <span style={{ color: isActive ? T.neon : T.text3, fontWeight: 600 }}> ({item.english})</span>
            </span>
          </button>
        );
      })}

      {/* Inbox — disabled placeholder (Chat backend not built). */}
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="בקרוב"
        style={{ ...ITEM_BASE, border: '1.5px solid transparent', background: 'transparent', color: T.text3, cursor: 'not-allowed', opacity: 0.5 }}
      >
        <span style={{ display: 'flex' }}><MessageCircle size={18} /></span>
        <span>הצ'אטים שלי<span style={{ fontWeight: 600 }}> (Inbox)</span></span>
      </button>

      {/* Profile / Settings */}
      {(() => {
        const isActive = active === 'settings';
        return (
          <button
            type="button"
            onClick={() => onSelect('settings')}
            style={{
              ...ITEM_BASE,
              border: `1.5px solid ${isActive ? T.neon : 'transparent'}`,
              background: isActive ? 'color-mix(in oklab, #00f6ff 14%, transparent)' : 'transparent',
              color: isActive ? T.neon : T.text2,
              cursor: 'pointer',
              boxShadow: isActive ? `0 0 12px -2px ${T.neon}` : 'none',
            }}
          >
            <span style={{ display: 'flex' }}><Settings size={18} /></span>
            <span>פרופיל / הגדרות<span style={{ color: isActive ? T.neon : T.text3, fontWeight: 600 }}> (Profile / Settings)</span></span>
          </button>
        );
      })()}

      <div style={{ flex: 1, minHeight: 8 }} />
      <div style={{ height: 1, background: T.line, margin: '4px 0' }} />

      {/* Sign Out — wired to the existing logout. */}
      <button
        type="button"
        onClick={onSignOut}
        style={{ ...ITEM_BASE, border: '1.5px solid transparent', background: 'transparent', color: T.text2, cursor: 'pointer' }}
      >
        <span style={{ display: 'flex', color: T.alert }}><LogOut size={18} /></span>
        <span>התנתקות<span style={{ color: T.text3, fontWeight: 600 }}> (Sign Out)</span></span>
      </button>
    </nav>
  );
}
