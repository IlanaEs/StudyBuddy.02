import { Shield, Upload } from 'lucide-react';
import type { TeacherOnboardingData } from '../../../../pages/TeacherOnboardingPage';
import { towTokens as T } from '../../../../design/tokens';
import { BentoCard, ScreenHeader, SquareCheckbox, FieldError } from '../primitives';

const LEGAL_ITEMS: Array<{ key: keyof TeacherOnboardingData; label: string }> = [
  { key: 'legalTax', label: 'אני מבין/ה את האחריות הפיננסית והמיסויית על הכנסותיי מהוראה.' },
  { key: 'legalContractor', label: 'אני פועל/ת כקבלן/ית עצמאי/ת ואינני עובד/ת של StudyBuddy.' },
  { key: 'legalMinors', label: 'קראתי ומאשר/ת את הצהרת הבטיחות והאתיקה בעבודה עם קטינים.' },
  { key: 'legalCommunity', label: 'אני מתחייב/ת לעמוד בתקנון הקהילה ובכללי ההתנהגות.' },
];

interface Screen7Props {
  data: TeacherOnboardingData;
  update: (patch: Partial<TeacherOnboardingData>) => void;
  errors: Record<string, string>;
}

/**
 * Screen 7 — Verifications & Compliance (אישורים ומשפטיות). Mandatory square
 * checkboxes (neon line-draw) + an optional document drop-zone.
 */
export function Screen7Verifications({ data, update, errors }: Screen7Props) {
  return (
    <div className="tow-step-in">
      <ScreenHeader title="אישורים ומשפטיות" english="Verifications & Compliance" subtitle="כדי להפעיל פרופיל יש לאשר את ההצהרות הבאות." />

      <BentoCard accent={T.line2} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Shield size={16} style={{ color: T.neon }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>הצהרות חובה (Required Declarations)</span>
          <span style={{ marginInlineStart: 'auto', fontFamily: T.fontMono, fontSize: 12, color: T.text3 }}>
            {LEGAL_ITEMS.filter((i) => data[i.key]).length}/{LEGAL_ITEMS.length}
          </span>
        </div>
        {LEGAL_ITEMS.map((item) => (
          <SquareCheckbox
            key={String(item.key)}
            checked={Boolean(data[item.key])}
            onChange={(v) => update({ [item.key]: v } as Partial<TeacherOnboardingData>)}
            label={item.label}
            required
          />
        ))}
        <FieldError>{errors.legal}</FieldError>
      </BentoCard>

      <div
        style={{
          marginTop: 16, padding: '20px 16px', borderRadius: T.radiusSm,
          border: `2px dashed ${T.line2}`, background: 'transparent',
          display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: T.card2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Shield size={20} style={{ color: T.text3 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text }}>
            מסמך אימות
            <span style={{ marginInlineStart: 8, fontSize: 11, fontWeight: 700, color: T.text3, fontFamily: T.fontMono }}>אופציונלי (Optional)</span>
          </div>
          <div style={{ fontSize: 12, color: T.text3, marginTop: 2 }}>תעודה / אישור הוראה — יעלה את אמינות הפרופיל.</div>
        </div>
        <button
          type="button"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: T.radiusSm, border: `1.5px solid ${T.line2}`, background: 'transparent', color: T.text2, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          <Upload size={14} />
          העלאה
        </button>
      </div>
    </div>
  );
}
