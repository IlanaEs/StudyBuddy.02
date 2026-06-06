import { useState } from 'react';
import { CalendarClock, SearchX, Bell, Search, Home, GraduationCap, Wallet, Settings } from 'lucide-react';
import {
  AppShell,
  FloatingTopNavbar,
  BentoCard,
  DashboardGrid,
  WizardShell,
  WizardFooter,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  UrgentButton,
  GlobalStateCard,
  RoleBadge,
  sbTokens as sb,
} from '../index';

// Visual sandbox for Design System v1 (route: /design-system). Token-pure; lets
// us eyeball the --sb palette + components in RTL without touching real screens.
const SWATCHES: Array<[string, string]> = [
  ['canvas', sb.bgCanvas], ['depth', sb.bgDepth], ['glass-base', sb.glassBase],
  ['border-cyber', sb.borderCyber], ['active', sb.active], ['primary-cta', sb.primaryCta],
  ['success', sb.success], ['warning', sb.warning], ['error', sb.error], ['locked', sb.locked],
];

export function DesignSystemPreview() {
  const [step, setStep] = useState(2);
  const tabs = [
    { id: 'home', icon: <Home size={18} />, label: 'בית (Home)', active: true },
    { id: 'lessons', icon: <GraduationCap size={18} />, label: 'שיעורים (Lessons)' },
    { id: 'wallet', icon: <Wallet size={18} />, label: 'ארנק (Wallet)' },
    { id: 'settings', icon: <Settings size={18} />, label: 'הגדרות (Settings)' },
  ];
  return (
    <AppShell
      navbar={
        <FloatingTopNavbar
          logo={<span>StudyBuddy</span>}
          tabs={tabs}
          actions={<><Search size={18} /><Bell size={18} /></>}
        />
      }
    >
      <h1 style={{ fontFamily: sb.fontUi, fontWeight: 800, color: sb.textPrimary, fontSize: 24, margin: '0 0 6px' }}>
        מערכת עיצוב (Design System) v1
      </h1>
      <p style={{ color: sb.textSecondary, fontFamily: sb.fontUi, margin: '0 0 20px' }}>תצוגה מקדימה של הטוקנים והרכיבים.</p>

      {/* Palette */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
        {SWATCHES.map(([name, val]) => (
          <div key={name} style={{ width: 96 }}>
            <div style={{ height: 44, borderRadius: sb.radiusSmall, background: val, border: `1px solid ${sb.borderCyber}` }} />
            <div style={{ fontSize: 11, color: sb.textMuted, fontFamily: sb.fontMono, marginTop: 4 }}>{name}</div>
          </div>
        ))}
      </div>

      {/* Buttons + badges */}
      <BentoCard title="כפתורים ותגי תפקיד" english="Buttons & Role Badges" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <PrimaryButton>שמירה (Save)</PrimaryButton>
          <SecondaryButton>חזרה</SecondaryButton>
          <GhostButton>ביטול (Cancel)</GhostButton>
          <UrgentButton>שיעור חירום (Emergency)</UrgentButton>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <RoleBadge role="student" /><RoleBadge role="teacher" /><RoleBadge role="parent" /><RoleBadge role="admin" />
        </div>
      </BentoCard>

      {/* Bento grid + states */}
      <DashboardGrid style={{ marginBottom: 16 }}>
        <BentoCard title="שיעור הבא" english="Next Lesson" icon={<CalendarClock size={16} />} colSpan={2}>
          <span style={{ fontFamily: sb.fontMono, color: sb.active, fontSize: 22 }}>₪120</span>
        </BentoCard>
        <BentoCard><GlobalStateCard variant="empty" icon={<SearchX size={28} />} title="אין שיעורים" description="עדיין לא נקבעו שיעורים." cta={{ label: 'מצאי מורה', onClick: () => {} }} /></BentoCard>
        <BentoCard><GlobalStateCard variant="loading" title="טוען נתונים…" /></BentoCard>
      </DashboardGrid>

      {/* Wizard preview */}
      <div style={{ border: `1px dashed ${sb.borderMuted}`, borderRadius: sb.radiusCard, overflow: 'hidden' }}>
        <WizardShell
          header={<h2 style={{ margin: 0, color: sb.textPrimary, fontFamily: sb.fontUi }}>אשף לדוגמה (Sample Wizard)</h2>}
          totalSteps={4}
          currentStep={step}
          stepKey={step}
          footer={<WizardFooter onBack={() => setStep((s) => Math.max(1, s - 1))} onNext={() => setStep((s) => Math.min(4, s + 1))} nextLabel="המשך (Next)" />}
        >
          <p style={{ color: sb.textSecondary, fontFamily: sb.fontUi }}>תוכן שלב {step} — סרגל ההתקדמות מקוטע, ללא טקסט "שלב X מתוך Y".</p>
        </WizardShell>
      </div>
    </AppShell>
  );
}
