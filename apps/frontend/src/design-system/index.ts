// StudyBuddy Design System v1 — canonical shared components.
// All consume --sb-* tokens only (no raw hex). RTL-first, bilingual labels.
// See docs/design-system.md.

export { AppShell } from './AppShell';
export { FloatingTopNavbar } from './FloatingTopNavbar';
export type { NavTab } from './FloatingTopNavbar';
export { BentoCard } from './BentoCard';
export { DashboardGrid } from './DashboardGrid';
export { WizardShell } from './WizardShell';
export { SegmentedProgressBar } from './SegmentedProgressBar';
export { WizardFooter } from './WizardFooter';
export { PrimaryButton, SecondaryButton, GhostButton, UrgentButton } from './buttons';
export { GlobalStateCard } from './GlobalStateCard';
export type { StateVariant } from './GlobalStateCard';
export { CrmTable, NaCell, NumCell } from './CrmTable';
export type { CrmColumn } from './CrmTable';
export { RoleBadge } from './RoleBadge';
export type { Role } from './RoleBadge';
export { SideDrawer } from './SideDrawer';
export { DetailPanel } from './DetailPanel';

// Token accessor (var(--sb-*) strings) — the canonical TS mirror.
export { sbTokens } from '../design/tokens';
export type { SbTokens } from '../design/tokens';
