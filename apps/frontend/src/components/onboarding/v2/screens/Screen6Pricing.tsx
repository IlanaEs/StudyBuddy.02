import type { TeacherOnboardingData } from '../../../../pages/TeacherOnboardingPage';
import { INTRO_PRICING_OPTIONS } from '../../../../content/teacherOnboardingContent';
import { towTokens as T } from '../../../../design/tokens';
import { BentoCard, ScreenHeader, SectionLabel, CardSelect, ChipSelect, FieldError } from '../primitives';
import { BrutalistSlider } from '../BrutalistSlider';

const PRICE_OPTIONS = [60, 80, 100, 120, 150, 180, 200, 250, 300, 400];

function priceColor(v: number): string {
  if (v < 100) return T.text3;        // budget
  if (v <= 200) return T.success;     // competitive sweet-spot
  return T.gold;                       // premium
}

interface Screen6Props {
  data: TeacherOnboardingData;
  update: (patch: Partial<TeacherOnboardingData>) => void;
  errors: Record<string, string>;
}

/**
 * Screen 6 — Pricing Framework (טווח מחירים). Bold monospace currency, a
 * sweet-spot slider, and intro-session + marathon toggles.
 */
export function Screen6Pricing({ data, update, errors }: Screen6Props) {
  const rate = Number(data.hourlyRate) || 0;
  const hasMarathon = data.commitmentTypes.includes('exam_marathons');

  return (
    <div className="tow-step-in">
      <ScreenHeader title="טווח מחירים" english="Pricing Framework" subtitle="קבעו את התעריף שלכם — תוכלו לעדכן בכל עת." />

      <BentoCard style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: T.fontMono, fontSize: 40, fontWeight: 800, color: rate ? priceColor(rate) : T.text3, lineHeight: 1 }}>
            ₪{rate || '—'}
          </div>
          <div style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>לשעת הוראה</div>
        </div>

        <BrutalistSlider
          label="תעריף שעתי"
          value={rate || null}
          options={PRICE_OPTIONS}
          onChange={(v) => update({ hourlyRate: String(v) })}
          suffix="₪"
          sweetSpot={(v) => v >= 100 && v <= 200}
          valueColor={priceColor}
        />
        <FieldError>{errors.hourlyRate}</FieldError>
      </BentoCard>

      {rate > 0 && (
        <div style={{ marginTop: 16 }}>
          <SectionLabel>שיעור היכרות (Trial Lesson)</SectionLabel>
          <div style={{ display: 'grid', gap: 8 }}>
            {INTRO_PRICING_OPTIONS.map((opt) => {
              const computed = opt.value === 'half_price' ? Math.round(rate / 2) : opt.value === 'twenty_percent' ? Math.round(rate * 0.8) : rate;
              return (
                <CardSelect
                  key={opt.value}
                  label={opt.label}
                  description={`₪${computed} לשיעור ההיכרות`}
                  selected={data.introSessionPricing === opt.value}
                  onClick={() => update({ introSessionPricing: opt.value as TeacherOnboardingData['introSessionPricing'] })}
                />
              );
            })}
          </div>
          <FieldError>{errors.introSessionPricing}</FieldError>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <SectionLabel>מרתון מבחנים (Exam Marathon)</SectionLabel>
        <ChipSelect
          label={hasMarathon ? 'מציע/ה מרתוני מבחנים' : 'הוסף/י מרתוני מבחנים'}
          selected={hasMarathon}
          onClick={() =>
            update({
              commitmentTypes: hasMarathon
                ? data.commitmentTypes.filter((c) => c !== 'exam_marathons')
                : [...data.commitmentTypes, 'exam_marathons'],
            })
          }
        />
      </div>
    </div>
  );
}
