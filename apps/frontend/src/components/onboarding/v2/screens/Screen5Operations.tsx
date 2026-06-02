import { Users, BookOpen, Award, Zap } from 'lucide-react';
import type { TeacherOnboardingData } from '../../../../pages/TeacherOnboardingPage';
import {
  MAX_STUDENTS_OPTIONS,
  WEEKLY_HOURS_OPTIONS,
  SLA_HOURS_OPTIONS,
  MARATHON_SESSION_OPTIONS,
  COMMITMENT_TYPES,
  EMERGENCY_AVAILABILITY_OPTIONS,
} from '../../../../content/teacherOnboardingContent';
import { towTokens as T } from '../../../../design/tokens';
import { BentoCard, ScreenHeader, SectionLabel, ChipSelect, CardSelect, FieldError } from '../primitives';
import { BrutalistSlider } from '../BrutalistSlider';

interface Screen5Props {
  data: TeacherOnboardingData;
  update: (patch: Partial<TeacherOnboardingData>) => void;
  errors: Record<string, string>;
}

function toggle<T extends string>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function OpsToggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 4px', background: 'transparent', border: 'none', cursor: 'pointer' }}
    >
      <span style={{ fontSize: 14, color: T.text }}>{label}</span>
      <span style={{ width: 42, height: 24, borderRadius: 999, background: on ? T.neon : T.line2, position: 'relative', transition: 'background 150ms ease', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 3, insetInlineStart: on ? 21 : 3, width: 18, height: 18, borderRadius: 999, background: '#0a1414', transition: 'inset-inline-start 150ms ease' }} />
      </span>
    </button>
  );
}

function OpsCard({ icon, color, title, children }: { icon: React.ReactNode; color: string; title: string; children: React.ReactNode }) {
  return (
    <BentoCard accent={`color-mix(in oklab, ${color} 45%, ${T.line2})`} style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: `color-mix(in oklab, ${color} 22%, transparent)`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{title}</span>
      </div>
      {children}
    </BentoCard>
  );
}

/**
 * Screen 5 — Teaching Operations Engine (מנוע ההוראה שלך). Brutalist sliders for
 * capacity + dependency toggles for booking rules, commitments and emergencies.
 * Maps only to existing TeacherOnboardingData fields.
 */
export function Screen5Operations({ data, update, errors }: Screen5Props) {
  const isManual = data.bookingApproval === 'manual';
  const hasMarathon = data.commitmentTypes.includes('exam_marathons');

  return (
    <div className="tow-step-in">
      <ScreenHeader title="מנוע ההוראה שלך" english="Teaching Operations Engine" subtitle="כוונון הקיבולת, אישור ההזמנות וסוגי המחויבות." />

      <OpsCard icon={<Users size={16} />} color={T.neon} title="קיבולת (Capacity)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <BrutalistSlider label="שעות הוראה שבועיות" value={data.weeklyTeachingHours} options={WEEKLY_HOURS_OPTIONS} onChange={(v) => update({ weeklyTeachingHours: v })} suffix="שעות" />
          <BrutalistSlider label="מקסימום תלמידים פעילים" value={data.maxActiveStudents} options={MAX_STUDENTS_OPTIONS} onChange={(v) => update({ maxActiveStudents: v })} suffix="תלמידים" />
          <OpsToggle label="עצור התאמות אוטומטית בהגעה לקיבולת" on={data.autoStopMatching} onToggle={() => update({ autoStopMatching: !data.autoStopMatching })} />
        </div>
        <FieldError>{errors.weeklyTeachingHours || errors.maxActiveStudents}</FieldError>
      </OpsCard>

      <OpsCard icon={<BookOpen size={16} />} color={T.gold} title="אישור הזמנות (Booking Approval)">
        <div style={{ display: 'grid', gap: 8 }}>
          <CardSelect label="אישור אוטומטי" description="הזמנות מאושרות מיידית" selected={data.bookingApproval === 'automatic'} onClick={() => update({ bookingApproval: 'automatic' })} />
          <CardSelect label="אישור ידני" description="אני מאשר/ת כל הזמנה" selected={isManual} onClick={() => update({ bookingApproval: 'manual' })} />
        </div>
        <FieldError>{errors.bookingApproval}</FieldError>
        {isManual && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
            <SectionLabel>זמן תגובה מקסימלי (SLA)</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SLA_HOURS_OPTIONS.map((h) => (
                <ChipSelect key={h} small label={`${h} ש'`} selected={data.slaHours === h} onClick={() => update({ slaHours: h })} />
              ))}
            </div>
            <FieldError>{errors.slaHours}</FieldError>
            <div style={{ marginTop: 12 }}>
              <SectionLabel>פעולה אוטומטית בתום ה-SLA</SectionLabel>
              <div style={{ display: 'flex', gap: 8 }}>
                <ChipSelect small label="אשר אוטומטית" selected={data.slaAutoAction === 'approve'} onClick={() => update({ slaAutoAction: 'approve' })} />
                <ChipSelect small label="דחה אוטומטית" selected={data.slaAutoAction === 'decline'} onClick={() => update({ slaAutoAction: 'decline' })} />
              </div>
              <FieldError>{errors.slaAutoAction}</FieldError>
            </div>
          </div>
        )}
      </OpsCard>

      <OpsCard icon={<Award size={16} />} color={T.success} title="סוגי מחויבות (Commitment Types)">
        <div style={{ display: 'grid', gap: 8 }}>
          {COMMITMENT_TYPES.map((c) => (
            <CardSelect key={c.value} label={c.label} selected={data.commitmentTypes.includes(c.value)} onClick={() => update({ commitmentTypes: toggle(data.commitmentTypes, c.value) })} />
          ))}
        </div>
        <FieldError>{errors.commitmentTypes}</FieldError>
        {hasMarathon && (
          <div style={{ marginTop: 12 }}>
            <SectionLabel>מספר שיעורים במרתון</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {MARATHON_SESSION_OPTIONS.map((n) => (
                <ChipSelect key={n} small label={String(n)} selected={data.marathonSessionCount === n} onClick={() => update({ marathonSessionCount: n })} />
              ))}
            </div>
            <FieldError>{errors.marathonSessionCount}</FieldError>
          </div>
        )}
      </OpsCard>

      <OpsCard icon={<Zap size={16} />} color={T.orange} title="זמינות לשיעורי חירום (Emergency Availability)">
        <div style={{ display: 'flex', gap: 8 }}>
          {EMERGENCY_AVAILABILITY_OPTIONS.map((opt) => (
            <ChipSelect key={opt.value} small label={opt.label} selected={data.emergencyAvailability === opt.value} onClick={() => update({ emergencyAvailability: opt.value })} />
          ))}
        </div>
        <FieldError>{errors.emergencyAvailability}</FieldError>
      </OpsCard>
    </div>
  );
}
