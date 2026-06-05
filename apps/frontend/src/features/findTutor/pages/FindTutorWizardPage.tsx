import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, CalendarHeart, Flame, KeyRound } from 'lucide-react';
import { useAuth } from '../../../auth/AuthProvider';
import { useMatchingStore } from '../../matching/store/matchingStore';
import { DualRangeSlider } from '../../matching/components/DualRangeSlider';
import { AvailabilityGrid } from '../../matching/components/AvailabilityGrid';
import { WizardProgress } from '../../matching/components/WizardProgress';
import { ScreenHeader, CardSelect, ChipSelect, NavButtons } from '../../../components/onboarding/v2/primitives';
import { towTokens as T } from '../../../design/tokens';
import { createStudentIntake, runMatching } from '../../../api/students';
import type { SoftCriteria } from '../../../api/students';
import { getLatestIntake, requestSubjectAddition } from '../api/findTutor';
import { SubjectAutocomplete } from '../components/SubjectAutocomplete';

const INDEX_TO_DAY = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const DAY_TO_INDEX: Record<string, number> = { ראשון: 0, שני: 1, שלישי: 2, רביעי: 3, חמישי: 4, שישי: 5, שבת: 6 };
const BUCKET_TO_RANGE: Record<string, { start: string; end: string }> = {
  morning: { start: '08:00', end: '12:00' },
  afternoon: { start: '12:00', end: '17:00' },
  evening: { start: '17:00', end: '22:00' },
};
function rangeToBucket(start: string): string {
  const h = parseInt(start.split(':')[0] ?? '0', 10);
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

const GOALS = [
  { value: 'single_session', label: 'שיעור חד-פעמי (Single Lesson)', icon: <GraduationCap size={20} /> },
  { value: 'ongoing', label: 'מורה קבוע/ה (Ongoing)', icon: <CalendarHeart size={20} /> },
  { value: 'exam_prep', label: 'מרתון לפני מבחן (Exam Bootcamp)', icon: <Flame size={20} /> },
];

export function FindTutorWizardPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth.session?.access_token ?? null;
  const store = useMatchingStore();

  const [loading, setLoading] = useState(true);
  const [hasIntake, setHasIntake] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Pulled (not re-asked)
  const [studentId, setStudentId] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);

  // Collected / pre-filled
  const [goal, setGoal] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [subjectIsCustom, setSubjectIsCustom] = useState(false);
  const [budgetMin, setBudgetMin] = useState(80);
  const [budgetMax, setBudgetMax] = useState(200);
  const [soft, setSoft] = useState<SoftCriteria>({});
  const [days, setDays] = useState<string[]>([]);
  const [times, setTimes] = useState<string[]>([]);

  // Prefill from the latest intake.
  useEffect(() => {
    store.reset();
    if (!token) {
      setLoading(false);
      return;
    }
    getLatestIntake(token).then((res) => {
      if (!('error' in res) && res.data.intake) {
        const p = res.data.intake;
        setHasIntake(true);
        setStudentId(p.student_id);
        setLevel(p.level);
        setGoal(p.goal ?? null);
        if (p.budget_min != null) setBudgetMin(p.budget_min);
        if (p.budget_max != null) setBudgetMax(p.budget_max);
        setSoft(p.soft_criteria ?? {});
        setDays((p.preferred_days ?? []).map((i) => INDEX_TO_DAY[i]).filter((d): d is string => !!d));
        setTimes([...new Set((p.preferred_time_ranges ?? []).map((r) => rangeToBucket(r.start)))]);
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function toggleGender(g: 'female' | 'male') {
    setSoft((s) => ({ ...s, teacher_gender: s.teacher_gender === g ? null : g }));
  }

  async function runMatch() {
    if (!token || !studentId) return;
    if (subjectIsCustom) {
      // Off-taxonomy → capture + block (never submit an off-taxonomy subject).
      if (subject.trim()) await requestSubjectAddition(token, subject.trim());
      setError('המקצוע נשלח לבדיקה ויתווסף בקרוב. בחרו מקצוע מהרשימה כדי להמשיך.');
      setStep(1);
      setSubject('');
      setSubjectIsCustom(false);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await createStudentIntake(
        {
          student_id: studentId,
          subject_name: subject,
          level: level ?? undefined,
          goal,
          location_preference: 'online',
          budget_min: budgetMin,
          budget_max: budgetMax,
          preferred_days: days.map((d) => DAY_TO_INDEX[d]).filter((n): n is number => typeof n === 'number'),
          preferred_time_ranges: times.map((t) => BUCKET_TO_RANGE[t]).filter((r): r is { start: string; end: string } => !!r),
          soft_criteria: soft,
        },
        token,
      );
      if ('error' in res) {
        setError(res.error ?? 'שגיאה ביצירת החיפוש. נסו שוב.');
        return;
      }
      const matching = await runMatching(res.data.intake_id, token);
      if ('error' in matching) {
        setError(matching.error ?? 'שגיאה בהרצת ההתאמה. נסו שוב.');
        return;
      }
      store.updateIntake({ subjectName: subject, studentId, fullName: auth.user?.full_name ?? '' });
      store.setMatchResults(
        matching.data.matches.map((m) => ({
          id: m.id,
          rank: m.rank,
          matchScore: m.matchScore,
          reason: m.reason,
          teacher: {
            id: m.teacherId,
            fullName: m.teacherFullName,
            bio: m.teacherBio ?? undefined,
            hourlyRate: m.teacherHourlyRate,
            ratingAvg: m.teacherRatingAvg,
            ratingCount: m.teacherRatingCount,
            isVerified: m.teacherIsVerified,
            availabilitySlots: m.teacherAvailabilitySlots,
          },
        })),
      );
      navigate('/onboarding/results');
    } catch {
      setError('שגיאת תקשורת. בדקו חיבור ונסו שוב.');
    } finally {
      setSubmitting(false);
    }
  }

  const canNext1 = !!goal && (subjectIsCustom ? subject.trim().length > 0 : subject.length > 0);
  const canNext3 = days.length > 0 && times.length > 0;

  return (
    <div dir="rtl" lang="he" className="tow tow-bg-glow" style={{ minHeight: '100dvh', color: T.text }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 18px 64px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: T.neon }}>
          מצא לי מורה חדש (Find Tutor)
        </p>

        {loading ? (
          <p style={{ marginTop: 20, color: T.text3, fontSize: 14 }}>טוען…</p>
        ) : !hasIntake ? (
          <div style={{ marginTop: 24 }}>
            <p style={{ color: T.text2, fontSize: 15 }}>כדי למצוא מורה חדש במהירות צריך קודם להשלים את ההרשמה.</p>
            <button onClick={() => navigate('/onboarding/matching')} style={ctaStyle}>למעבר להרשמה</button>
          </div>
        ) : (
          <>
            <div style={{ margin: '14px 0 20px' }}>
              <WizardProgress current={step} total={3} />
            </div>

            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <ScreenHeader title="הגדרת שיעור" english="Lesson Setup" subtitle="מה המטרה ובאיזה מקצוע?" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {GOALS.map((g) => (
                    <CardSelect key={g.value} label={g.label} icon={g.icon} selected={goal === g.value} onClick={() => setGoal(g.value)} />
                  ))}
                </div>
                <SubjectAutocomplete
                  value={subject}
                  isCustom={subjectIsCustom}
                  onChange={(s, custom) => { setSubject(s); setSubjectIsCustom(custom); setError(''); }}
                />

                {/* Direct Tutor Code bypass — disabled (Phase 2, backend not built). */}
                <div
                  aria-disabled="true"
                  title="בקרוב"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '14px',
                    borderRadius: T.radiusSm, border: `1.5px dashed ${T.line2}`,
                    background: 'color-mix(in oklab, #3f7e76 18%, transparent)', color: T.text3, opacity: 0.7,
                  }}
                >
                  <KeyRound size={16} />
                  <span style={{ fontSize: 13 }}>הזן קוד מורה (Enter Tutor Code) — בקרוב</span>
                </div>

                {error && <div style={{ color: T.alert, fontSize: 13 }}>{error}</div>}
                <NavButtons hideBack onNext={() => setStep(2)} nextLabel="המשך" nextEnglish="Next" disabled={!canNext1} />
              </div>
            )}

            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <ScreenHeader title="תקציב והעדפות" english="Budget & Preferences" />
                <DualRangeSlider
                  min={0}
                  max={500}
                  step={10}
                  valueMin={budgetMin}
                  valueMax={budgetMax}
                  onChangeMin={setBudgetMin}
                  onChangeMax={setBudgetMax}
                  formatValue={(v) => (v === 500 ? '₪500+' : `₪${v}`)}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <ChipSelect label="מורה אישה" selected={soft.teacher_gender === 'female'} onClick={() => toggleGender('female')} />
                  <ChipSelect label="מורה גבר" selected={soft.teacher_gender === 'male'} onClick={() => toggleGender('male')} />
                  <ChipSelect label="קצב מהיר ותכלס" selected={!!soft.fast_pace} onClick={() => setSoft((s) => ({ ...s, fast_pace: !s.fast_pace }))} />
                  <ChipSelect label="ניסיון עם ADHD" selected={!!soft.adhd_experience} onClick={() => setSoft((s) => ({ ...s, adhd_experience: !s.adhd_experience }))} />
                  <ChipSelect label="גישה מכילה" selected={!!soft.inclusive_approach} onClick={() => setSoft((s) => ({ ...s, inclusive_approach: !s.inclusive_approach }))} />
                </div>
                <NavButtons onBack={() => setStep(1)} onNext={() => setStep(3)} nextLabel="המשך ללוח זמנים" nextEnglish="Next to Schedule" />
              </div>
            )}

            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <ScreenHeader title="חלונות זמינות" english="Select Availability" />
                <AvailabilityGrid selectedDays={days} selectedTimes={times} onChangeDays={setDays} onChangeTimes={setTimes} />
                {error && <div style={{ color: T.alert, fontSize: 13 }}>{error}</div>}
                <NavButtons
                  onBack={() => setStep(2)}
                  onNext={() => void runMatch()}
                  nextLabel={submitting ? 'מחפש…' : 'מצא לי התאמות'}
                  nextEnglish="Run AI Match"
                  loading={submitting}
                  disabled={!canNext3}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const ctaStyle = {
  marginTop: 16,
  padding: '11px 20px',
  borderRadius: T.radiusSm,
  background: T.neon,
  color: '#04201f',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 800,
} as const;
