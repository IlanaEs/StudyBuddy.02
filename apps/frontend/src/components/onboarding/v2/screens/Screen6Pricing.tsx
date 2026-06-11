import { Minus, Plus } from 'lucide-react';

import type { TeacherOnboardingData } from '../../../../pages/TeacherOnboardingPage';
import { INTRO_PRICING_OPTIONS } from '../../../../content/teacherOnboardingContent';
import { towTokens as T } from '../../../../design/tokens';
import { BentoCard, ScreenHeader, SectionLabel, CardSelect, ChipSelect, FieldError } from '../primitives';

// Pricing bounds (₪). Step 10 for the slider + buttons; the manual input accepts
// any integer and is clamped to [MIN, MAX] on entry.
const MIN_PRICE = 50;
const MAX_PRICE = 500;
const PRICE_STEP = 10;

function priceColor(v: number): string {
  if (v < 100) return T.text3;        // budget
  if (v <= 200) return T.success;     // competitive sweet-spot
  return T.gold;                       // premium
}

const clampPrice = (v: number) => Math.min(MAX_PRICE, Math.max(MIN_PRICE, v));
const snapToStep = (v: number) => Math.round(v / PRICE_STEP) * PRICE_STEP;

interface Screen6Props {
  data: TeacherOnboardingData;
  update: (patch: Partial<TeacherOnboardingData>) => void;
  errors: Record<string, string>;
}

/**
 * Screen 6 — Pricing Framework (טווח מחירים). Draggable native range (step ₪10),
 * ±₪10 buttons, and a manual number input — all clamped to [MIN_PRICE, MAX_PRICE].
 */
export function Screen6Pricing({ data, update, errors }: Screen6Props) {
  const rate = Number(data.hourlyRate) || 0;
  const hasMarathon = data.commitmentTypes.includes('exam_marathons');
  const sliderValue = rate || MIN_PRICE;

  const setRate = (v: number) => update({ hourlyRate: String(clampPrice(v)) });
  const nudge = (dir: -1 | 1) => setRate(snapToStep(sliderValue) + dir * PRICE_STEP);

  return (
    <div className="tow-step-in">
      <ScreenHeader title="טווח מחירים" english="Pricing Framework" subtitle="קבעו את התעריף שלכם — תוכלו לעדכן בכל עת." />

      <BentoCard style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: T.fontMono, fontSize: 40, fontWeight: 800, color: rate ? priceColor(rate) : T.text3, lineHeight: 1 }}>
            ₪{rate || '—'}
          </div>
          <div style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>לשעת הוראה (per hour)</div>
        </div>

        {/* Draggable slider + ±10 buttons */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>תעריף שעתי (Hourly rate)</span>
            <span style={{ fontFamily: T.fontMono, fontSize: 12, color: T.text3 }}>₪{MIN_PRICE}–₪{MAX_PRICE}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" onClick={() => nudge(-1)} aria-label="הפחת ₪10" style={squareBtn}>
              <Minus size={16} />
            </button>
            <input
              type="range"
              min={MIN_PRICE}
              max={MAX_PRICE}
              step={PRICE_STEP}
              value={sliderValue}
              onChange={(e) => setRate(Number(e.target.value))}
              aria-label="תעריף שעתי"
              style={{ flex: 1, accentColor: T.orange, height: 8, cursor: 'pointer' }}
            />
            <button type="button" onClick={() => nudge(1)} aria-label="הוסף ₪10" style={squareBtn}>
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Manual numeric entry — type any value; clamp to range on change. */}
        <div>
          <SectionLabel>הזנת מחיר ידנית (Enter price)</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: T.fontMono, fontSize: 18, fontWeight: 800, color: T.text3 }}>₪</span>
            <input
              type="number"
              inputMode="numeric"
              min={MIN_PRICE}
              max={MAX_PRICE}
              step={PRICE_STEP}
              value={rate || ''}
              placeholder={String(MIN_PRICE)}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') { update({ hourlyRate: '' }); return; }
                const n = Number(raw);
                if (Number.isFinite(n)) setRate(n);
              }}
              aria-label="הזנת מחיר ידנית"
              style={{
                width: 120,
                fontFamily: T.fontMono,
                fontSize: 18,
                fontWeight: 800,
                padding: '8px 12px',
                background: T.card2,
                border: `1.5px solid ${T.line2}`,
                borderRadius: 8,
                color: rate ? priceColor(rate) : T.text,
              }}
            />
          </div>
        </div>

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

const squareBtn: React.CSSProperties = {
  width: 34, height: 34, flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: T.card2, border: `1.5px solid ${T.line2}`, borderRadius: 6,
  color: T.text, cursor: 'pointer',
};
