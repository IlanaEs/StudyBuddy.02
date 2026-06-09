import { BarChart3, ClipboardCheck, LayoutDashboard, LifeBuoy, Users, type LucideIcon } from 'lucide-react';

// The 4 CORE admin sections surfaced in the shared FloatingTopNavbar. Admin uses
// the same canonical navbar as the other roles — NO sidebar, NO fork.
// Bilingual tooltips per the Bilingual UI Labeling rule (nav items carry an
// English term): rendered as `<labelHe> (<labelEn>)`.
//
// The audit-log route and the Tier-2 deferred sections (Lessons / Reports /
// System Health) intentionally do NOT appear here — they remain routed but are
// not wired into this nav.

export type AdminNavTab = {
  id: string;
  icon: LucideIcon;
  labelHe: string;
  labelEn: string;
  to: string;
};

export const ADMIN_NAV_TABS: AdminNavTab[] = [
  { id: 'overview', icon: LayoutDashboard, labelHe: 'תצוגה כללית', labelEn: 'Overview', to: '/admin/dashboard' },
  { id: 'users', icon: Users, labelHe: 'ניהול משתמשים', labelEn: 'Users CRM', to: '/admin/users' },
  { id: 'approvals', icon: ClipboardCheck, labelHe: 'אישורים', labelEn: 'Approvals', to: '/admin/approvals' },
  { id: 'matching', icon: BarChart3, labelHe: 'תובנות התאמה', labelEn: 'Matching Insights', to: '/admin/matching' },
  { id: 'support', icon: LifeBuoy, labelHe: 'תמיכה ופניות', labelEn: 'Support & Tickets', to: '/admin/support' },
];
