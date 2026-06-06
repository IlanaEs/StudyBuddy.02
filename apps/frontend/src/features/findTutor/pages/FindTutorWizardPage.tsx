import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@mantine/hooks';
import { GraduationCap, CalendarHeart, Flame, KeyRound } from 'lucide-react';
import { useAuth } from '../../../auth/AuthProvider';
import { useMatchingStore } from '../../matching/store/matchingStore';
import { MatchingLoadingScreen } from '../../matching/components/MatchingLoadingScreen';
import { DualRangeSlider } from '../../matching/components/DualRangeSlider';
import { AvailabilityGrid } from '../../matching/components/AvailabilityGrid';
import { WizardProgress } from '../../matching/components/WizardProgress';
import { ScreenHeader, CardSelect, ChipSelect, NavButtons } from '../../../components/onboarding/v2/primitives';
import { towTokens as T } from '../../../design/tokens';
import { createStudentIntake, runMatching } from '../../../api/students';
import type { SoftCriteria } from '../../../api/students';
import { getLatestIntake, getMyStudentProfile, requestSubjectAddition } from '../api/findTutor';
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

// Step-3 one-tap availability presets (operate on the day/time-bucket model).
const PRESETS = [
  { id: 'after16', label: 'כל יום אחרי 16:00', days: [...INDEX_TO_DAY], times: ['afternoon', 'evening'] },
  { id: 'evenings', label: 'ערבים בלבד', days: [...INDEX_TO_DAY], times: ['evening'] },
  { id: 'weekend', label: 'סופ״ש בלבד', days: ['שישי', 'שבת'], times: ['morning', 'afternoon', 'evening'] },
];

export function FindTutorWizardPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth.session?.access_token ?? null;
  const store = useMatchingStore();
  const isNarrow = useMediaQuery('(max-width: 720px)') ?? false;

  const [loading, setLoading] = useState(true);
  // Non-null ONLY when the profile bootstrap fails (404 = no profile, or a real
  // error). Renders a small clean error state — Find Tutor NEVER routes into the
  // onboarding wizard. A profiled student always opens directly on Step 1.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Pulled from the profile (not re-asked)
  const [studentId, setStudentId] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);

  // Collected / optionally pre-filled
  const [goal, setGoal] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [subjectIsCustom, setSubjectIsCustom] = useState(false);
  const [budgetMin, setBudgetMin] = useState(80);
  const [budgetMax, setBudgetMax] = useState(200);
  const [soft, setSoft] = useState<SoftCriteria>({});
  const [days, setDays] = useState<string[]>([]);
  const [times, setTimes] = useState<string[]>([]);

  // Bootstrap: gate on the student PROFILE (not the intakes endpoint). Then
  // optionally prefill from the latest intake as non-blocking defaults.
  useEffect(() => {
    let cancelled = false;
    store.reset();
    (async () => {
      if (!token) {
        setLoadError('צריך להתחבר כדי למצוא מורה.');
        setLoading(false);
        return;
      }
      const prof = await getMyStudentProfile(token);
      if (cancelled) return;
      if ('error' in prof) {
        // 404 = no student profile; anything else = a real load error. Either way
        // a small clean error state — never the onboarding wizard, never hidden.
        setLoadError(
          prof.status === 404
            ? 'לא נמצא פרופיל תלמיד פעיל לחשבון הזה.'
            : 'לא הצלחנו לטעון את הפרופיל כרגע. נסו שוב בעוד רגע.',
        );
        setLoading(false);
        return;
      }
      setStudentId(prof.data.student_id);
      store.setFlow('quick');

      // Optional prefill — never gates, never forces old state.
      const latest = await getLatestIntake(token);
      if (cancelled) return;
      if (!('error' in latest) && latest.data.intake) {
        const i = latest.data.intake;
        setPrefilled(true);
        setLevel(i.level);
        setGoal(i.goal ?? null);
        if (i.budget_min != null) setBudgetMin(i.budget_min);
        if (i.budget_max != null) setBudgetMax(i.budget_max);
        setSoft(i.soft_criteria ?? {});
        setDays((i.preferred_days ?? []).map((d) => INDEX_TO_DAY[d]).filter((d): d is string => !!d));
        setTimes([...new Set((i.preferred_time_ranges ?? []).map((r) => rangeToBucket(r.start)))]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function toggleGender(g: 'female' | 'male') {
    setSoft((s) => ({ ...s, teacher_gender: s.teacher_gender === g ? null : g }));
  }

  function applyPreset(p: (typeof PRESETS)[number]) {
    setDays([...p.days]);
    setTimes([...p.times]);
  }

  async function runMatch() {
    if (!token || !studentId) return;
    if (subjectIsCustom) {
      // Off-taxonomy → capture + block (never submit an off-taxonomy subject; no matching).
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
      store.setFlow('quick');
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

  // Full-screen algorithmic loading overlay while matching runs (not for the bypass).
  if (submitting) return <MatchingLoadingScreen />;

  return (
    <div dir="rtl" lang="he" className="tow tow-bg-glow" style={{ minHeight: '100dvh', color: T.text }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 18px 64px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: T.neon }}>
          מצא לי מורה חדש (Find Tutor)
        </p>

        {loading ? (
          <p style={{ marginTop: 20, color: T.text3, fontSize: 14 }}>טוען…</p>
        ) : loadError ? (
          // Small clean error state. Find Tutor never routes into onboarding.
          <div style={{ marginTop: 24 }}>
            <p style={{ color: T.text2, fontSize: 15 }}>{loadError}</p>
            <button onClick={() => navigate('/student/dashboard')} style={ctaStyle}>חזרה לדשבורד (Dashboard)</button>
          </div>
        ) : (
          <>
            {!prefilled && (
              // Clean empty state: profiled student with no prior search.
              <p style={{ margin: '10px 0 0', color: T.text3, fontSize: 13.5 }}>
                זה החיפוש הראשון שלך — מלא/י את הפרטים ונמצא לך התאמה.
              </p>
            )}
            <div style={{ margin: '14px 0 20px' }}>
              <WizardProgress current={step} total={3} />
            </div>

            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <ScreenHeader title="הגדרת שיעור" english="Lesson Setup" subtitle="מה המטרה ובאיזה מקצוע?" />
                <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '2fr 1fr', gap: 16, alignItems: 'start' }}>
                  {/* Right 2/3: goal + subject */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                  </div>

                  {/* Left 1/3: Direct Tutor Search — DISABLED (Phase 2, backend not built). */}
                  <div
                    aria-disabled="true"
                    title="בקרוב"
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 10, padding: 16,
                      borderRadius: T.radius, border: `1.5px dashed ${T.line2}`,
                      background: 'color-mix(in oklab, #3f7e76 18%, transparent)', opacity: 0.7,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.text2 }}>
                      <KeyRound size={16} />
                      <span style={{ fontSize: 13.5, fontWeight: 800 }}>חיפוש מורה ישיר (Direct Tutor)</span>
                    </div>
                    <input
                      disabled
                      placeholder="קוד / שם מורה"
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: T.radiusSm,
                        background: 'color-mix(in oklab, #3f7e76 26%, transparent)',
                        border: `1px solid ${T.ink}`, color: T.text3, fontSize: 13.5, outline: 'none',
                      }}
                    />
                    <p style={{ margin: 0, fontSize: 12, color: T.text3, lineHeight: 1.6 }}>
                      בקרוב — קביעת שיעור ישירה לפי קוד מורה, ללא תהליך התאמה.
                    </p>
                  </div>
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
                  <ChipSelect label="גישה תומכת ומחזקת ביטחון" selected={!!soft.inclusive_approach} onClick={() => setSoft((s) => ({ ...s, inclusive_approach: !s.inclusive_approach }))} />
                </div>
                <NavButtons onBack={() => setStep(1)} onNext={() => setStep(3)} nextLabel="המשך ללוח זמנים" nextEnglish="Next to Schedule" />
              </div>
            )}

            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <ScreenHeader title="חלונות זמינות" english="Select Availability" />
                {/* One-tap presets */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p)}
                      style={{
                        padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
                        border: `1px solid ${T.ink}`, background: 'color-mix(in oklab, #3f7e76 24%, transparent)',
                        color: T.text2, fontSize: 13, fontWeight: 700,
                        transition: 'border-color 250ms ease-out, color 250ms ease-out',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <AvailabilityGrid selectedDays={days} selectedTimes={times} onChangeDays={setDays} onChangeTimes={setTimes} />
                {error && <div style={{ color: T.alert, fontSize: 13 }}>{error}</div>}
                <NavButtons
                  onBack={() => setStep(2)}
                  onNext={() => void runMatch()}
                  nextLabel="מצא לי התאמות"
                  nextEnglish="Run AI Match"
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
