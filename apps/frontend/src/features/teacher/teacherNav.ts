import { CalendarClock, LayoutDashboard, Settings, Users, Wallet, type LucideIcon } from 'lucide-react';

import type { DashboardTab } from './types/teacherDashboard.types';

// The 5 teacher dashboard tabs, surfaced in the shared FloatingTopNavbar
// (icon-only; bilingual tooltips). ids match the store's DashboardTab.
export type TeacherNavTab = {
  id: DashboardTab;
  icon: LucideIcon;
  labelHe: string;
  labelEn: string;
};

export const TEACHER_NAV_TABS: TeacherNavTab[] = [
  { id: 'overview', icon: LayoutDashboard, labelHe: 'תצוגה כללית', labelEn: 'Overview' },
  { id: 'calendar', icon: CalendarClock, labelHe: 'יומן ופניות', labelEn: 'Calendar & Inbox' },
  { id: 'finance', icon: Wallet, labelHe: 'התחשבנות', labelEn: 'Finance & Ledger' },
  { id: 'students', icon: Users, labelHe: 'ניהול תלמידים', labelEn: 'Students CRM' },
  { id: 'settings', icon: Settings, labelHe: 'הגדרות', labelEn: 'Settings' },
];
