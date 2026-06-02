import type { ReactNode } from 'react';
import { Camera, GraduationCap, Briefcase } from 'lucide-react';
import type { TeacherOnboardingData } from '../../../../pages/TeacherOnboardingPage';
import { PROFESSIONAL_STATUS_OPTIONS, ACADEMIC_PATH_STATUSES, type ProfessionalStatus } from '../../../../content/teacherOnboardingContent';
import { towTokens as T } from '../../../../design/tokens';
import { ScreenHeader, SectionLabel, CardSelect, FieldError } from '../primitives';
import { FloatingLabelInput } from '../FloatingLabelInput';

interface Screen2Props {
  data: TeacherOnboardingData;
  update: (patch: Partial<TeacherOnboardingData>) => void;
  errors: Record<string, string>;
  onPickImage: () => void;
  /** Parent-provided academic autocomplete inputs (institution + field + year), shown for academic paths. */
  academicSlot: ReactNode;
}

function isAcademic(status: ProfessionalStatus | null): boolean {
  return status != null && ACADEMIC_PATH_STATUSES.includes(status);
}

/**
 * Screen 2 — Experience & Expertise (ניסיון ומומחיות). Identity basics + a
 * multi-select professional-status card grid that unlocks conditional inputs.
 */
export function Screen2Experience({ data, update, errors, onPickImage, academicSlot }: Screen2Props) {
  const academic = isAcademic(data.professionalStatus);

  return (
    <div className="tow-step-in">
      <ScreenHeader title="ניסיון ומומחיות" english="Experience & Expertise" subtitle="ספרו לנו מי אתם מקצועית — זה מה שתלמידים יראו." />

      {/* Identity basics */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', marginBottom: 16 }}>
        <button
          type="button"
          onClick={onPickImage}
          aria-label="העלאת תמונה"
          style={{
            width: 64, flexShrink: 0, borderRadius: T.radiusSm, border: `2px dashed ${T.line2}`,
            background: data.profileImagePreview ? `center/cover no-repeat url(${data.profileImagePreview})` : T.card2,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: T.text3,
          }}
        >
          {!data.profileImagePreview && <Camera size={20} />}
        </button>
        <div style={{ flex: 1 }}>
          <FloatingLabelInput label="שם מלא" value={data.fullName} onChange={(v) => update({ fullName: v })} />
        </div>
      </div>
      <FieldError>{errors.fullName}</FieldError>

      {/* Professional status (multi-select cards) */}
      <div style={{ marginTop: 8 }}>
        <SectionLabel>מעמד מקצועי (Professional Status)</SectionLabel>
        <div style={{ display: 'grid', gap: 8 }}>
          {PROFESSIONAL_STATUS_OPTIONS.map((opt) => (
            <CardSelect
              key={opt.value}
              label={opt.label}
              icon={ACADEMIC_PATH_STATUSES.includes(opt.value) ? <GraduationCap size={18} /> : <Briefcase size={18} />}
              badge={data.professionalStatus === opt.value ? 'נבחר' : undefined}
              selected={data.professionalStatus === opt.value}
              onClick={() => update({ professionalStatus: opt.value })}
            />
          ))}
        </div>
        <FieldError>{errors.professionalStatus}</FieldError>
      </div>

      {/* Conditional inputs unlocked by status */}
      {data.professionalStatus && (
        <div style={{ marginTop: 18 }}>
          <SectionLabel>{academic ? 'רקע אקדמי (Academic Background)' : 'ניסיון ומומחיות (Experience & Expertise)'}</SectionLabel>
          {academic ? (
            academicSlot
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <FloatingLabelInput label="שנות ניסיון" value={data.yearsOfExperience} onChange={(v) => update({ yearsOfExperience: v })} inputMode="numeric" mono />
              <FieldError>{errors.yearsOfExperience}</FieldError>
              <FloatingLabelInput label="תחומי מומחיות" value={data.expertiseAreas} onChange={(v) => update({ expertiseAreas: v })} />
              <FieldError>{errors.expertiseAreas}</FieldError>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
