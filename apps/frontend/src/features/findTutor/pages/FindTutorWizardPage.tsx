import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, CalendarHeart, Flame, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../auth/AuthProvider';
import { useMatchingStore } from '../../matching/store/matchingStore';
import { DualRangeSlider } from '../../matching/components/DualRangeSlider';
import { AvailabilityGrid } from '../../matching/components/AvailabilityGrid';
import { WizardShell, WizardFooter, BentoCard, GlobalStateCard, sbTokens as sb } from '../../../design-system';
import { createStudentIntake, runMatching } from '../../../api/students';
import type { SoftCriteria } from '../../../api/students';
import { getLatestIntake, getMyStudentProfile } from '../api/findTutor';
import { SubjectAutocomplete } from '../components/SubjectAutocomplete';

const INDEX_TO_DAY = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const DAY_TO_INDEX: Record<string, number> = { ראשון: 0, שני: 1, שלישי: 2, רביעי: 3, חמישי: 4, שישי: 5, שבת: 6 };
const BUCKET_TO_RANGE: Record<string, { start: string; end: string }> = {
  morning: { start: '08:00', end: '12:00' },
  afternoon: { start: '12:00', end: '17:00' },
  evening: { start: '17:00', end: '22:00' },
};
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

// Level categories (the matching-relevant value; mirrors students.grade_level and
// teacher_subjects.level). The quick wizard lets a student temporarily override the
// level for THIS search only — never persisted back to the profile.
const LEVELS: { value: string; he: string; en: string }[] = [
  { value: 'elementary', he: 'יסודי', en: 'Elementary' },
  { value: 'middle', he: 'חטיבה', en: 'Middle' },
  { value: 'high', he: 'תיכון', en: 'High School' },
  { value: 'academic', he: 'אקדמי', en: 'Academic' },
];
function levelLabel(value: string | null): string {
  if (!value) return 'לא הוגדר (Not set)';
  const m = LEVELS.find((l) => l.value === value);
  return m ? `${m.he} (${m.en})` : value;
}

const STEP_HEADERS: Record<number, { title: string; english: string; subtitle?: string }> = {
  1: { title: 'הגדרת שיעור', english: 'Lesson Setup', subtitle: 'מה המטרה ובאיזה מקצוע?' },
  2: { title: 'תקציב', english: 'Budget', subtitle: 'מה טווח המחיר לשעה שמתאים לך?' },
  3: { title: 'חלונות זמינות', english: 'Select Availability' },
  4: { title: 'העדפות מיוחדות', english: 'Preferences', subtitle: 'העדפות נוספות לחיפוש הזה (לא חובה).' },
};

export function FindTutorWizardPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth.session?.access_token ?? null;
  const store = useMatchingStore();

  const [loading, setLoading] = useState(true);
  // Non-null ONLY when the profile bootstrap fails (404 = no profile, or a real
  // error). Renders a small clean error state — Find Tutor NEVER routes into the
  // onboarding wizard. A profiled student always opens directly on Step 1.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [manualDone, setManualDone] = useState(false);

  // Pulled from the profile (not re-asked)
  const [studentId, setStudentId] = useState<string | null>(null);
  // Level context: defaults from the stable students.grade_level; can be temporarily
  // overridden for this search via the subject-step control (never persisted).
  const [level, setLevel] = useState<string | null>(null);
  const [levelEditing, setLevelEditing] = useState(false);

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

      // Default the level context from the STABLE profile grade_level.
      setLevel(prof.data.grade_level);

      // Optional prefill — never gates, never forces old state.
      const latest = await getLatestIntake(token);
      if (cancelled) return;
      if (!('error' in latest) && latest.data.intake) {
        const i = latest.data.intake;
        setPrefilled(true);
        // Fall back to the last search's level only when no stable grade_level is saved.
        if (prof.data.grade_level == null) setLevel(i.level);
        setGoal(i.goal ?? null);
        if (i.budget_min != null) setBudgetMin(i.budget_min);
        if (i.budget_max != null) setBudgetMax(i.budget_max);
        setSoft(i.soft_criteria ?? {});
        // Availability is NOT prefilled — the grid opens empty (aligned with onboarding);
        // the student picks fresh windows (or one-tap presets / calendar sync) per search.
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

  // Off-taxonomy course → store a manual-match lead on the intake (free-text +
  // flag), no automatic matching. We'll match the student manually.
  async function submitManualMatch() {
    if (!token || !studentId) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await createStudentIntake(
        {
          student_id: studentId,
          custom_subject_text: subject.trim(),
          needs_manual_match: true,
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
        setError(res.error ?? 'שגיאה בשליחת הבקשה. נסו שוב.');
        return;
      }
      setManualDone(true);
    } catch {
      setError('שגיאת תקשורת. בדקו חיבור ונסו שוב.');
    } finally {
      setSubmitting(false);
    }
  }

  async function runMatch() {
    if (!token || !studentId) return;
    if (subjectIsCustom) {
      // Off-taxonomy course → manual-match lead, not an automatic search.
      await submitManualMatch();
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

  // ── Pre-wizard states (DS GlobalStateCard on an --sb canvas) ───────────────
  if (submitting) {
    return (
      <Canvas>
        <GlobalStateCard variant="loading" fullPage title="מחפשים מורים מתאימים…" description="מצליבים זמינות, תקציב והעדפות כדי לבנות לך התאמות." />
      </Canvas>
    );
  }
  if (manualDone) {
    return (
      <Canvas>
        <GlobalStateCard
          variant="success"
          fullPage
          icon={<CheckCircle2 size={32} />}
          title="קיבלנו את הבקשה (Request Received)"
          description="הקורס שביקשת אינו בקטלוג — נבצע עבורך התאמה ידנית ונחזור אליך בהקדם."
          cta={{ label: 'חזרה לדשבורד (Dashboard)', onClick: () => navigate('/student/dashboard') }}
        />
      </Canvas>
    );
  }
  if (loading) {
    return (
      <Canvas>
        <GlobalStateCard variant="loading" fullPage title="טוען…" />
      </Canvas>
    );
  }
  if (loadError) {
    return (
      <Canvas>
        <GlobalStateCard
          variant="error"
          fullPage
          icon={<AlertCircle size={32} />}
          title={loadError}
          cta={{ label: 'חזרה לדשבורד (Dashboard)', onClick: () => navigate('/student/dashboard') }}
        />
      </Canvas>
    );
  }

  // ── Wizard ────────────────────────────────────────────────────────────────
  const H = STEP_HEADERS[step] ?? STEP_HEADERS[1]!;
  const header = (
    <div>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: sb.active, fontFamily: sb.fontUi }}>
        מצא לי מורה חדש (Find Tutor)
      </p>
      <h2 style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 800, color: sb.textPrimary, fontFamily: sb.fontUi }}>
        {H.title}
        {H.english ? <span style={{ color: sb.textMuted, fontWeight: 600 }}> ({H.english})</span> : null}
      </h2>
      {H.subtitle && <p style={{ margin: '4px 0 0', color: sb.textSecondary, fontSize: 14 }}>{H.subtitle}</p>}
      {step === 1 && !prefilled && (
        <p style={{ margin: '8px 0 0', color: sb.textMuted, fontSize: 13 }}>זה החיפוש הראשון שלך — מלא/י את הפרטים ונמצא לך התאמה.</p>
      )}
    </div>
  );

  const footer =
    step === 1 ? (
      <WizardFooter onNext={() => setStep(2)} nextLabel="המשך (Next)" nextDisabled={!canNext1} />
    ) : step === 2 ? (
      <WizardFooter onBack={() => setStep(1)} backLabel="חזרה (Back)" onNext={() => setStep(3)} nextLabel="המשך ללוח זמנים (Next)" />
    ) : step === 3 ? (
      <WizardFooter onBack={() => setStep(2)} backLabel="חזרה (Back)" onNext={() => setStep(4)} nextLabel="המשך להעדפות (Next)" nextDisabled={!canNext3} />
    ) : (
      <WizardFooter onBack={() => setStep(3)} backLabel="חזרה (Back)" onNext={() => void runMatch()} nextLabel="מצא לי התאמות (Run AI Match)" />
    );

  return (
    <WizardShell header={header} totalSteps={4} currentStep={step} stepKey={step} footer={footer}>
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 4 }}>
          {/* Right 2/3: goal + subject */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {GOALS.map((g) => (
                <GoalCard key={g.value} icon={g.icon} label={g.label} selected={goal === g.value} onClick={() => setGoal(g.value)} />
              ))}
            </div>
            {/* Hero intake card — the current question (subject) is the visual anchor. */}
            <BentoCard hover={false} style={{ padding: 18 }}>
              <p style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800, color: sb.textPrimary, fontFamily: sb.fontUi }}>
                באיזה מקצוע תרצו להתמקד? (Subject)
              </p>
              <SubjectAutocomplete value={subject} isCustom={subjectIsCustom} level={level} onChange={(s, custom) => { setSubject(s); setSubjectIsCustom(custom); setError(''); }} />
            </BentoCard>

            <LevelContextControl
              level={level}
              editing={levelEditing}
              onToggle={() => setLevelEditing((v) => !v)}
              onPick={(v) => { setLevel(v); setLevelEditing(false); }}
            />
          </div>

          {/* Left 1/3: Direct Tutor Search — DISABLED (Phase 2). */}
          <BentoCard hover={false} style={{ border: `1.5px dashed ${sb.borderMuted}`, opacity: 0.7, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: sb.textSecondary }}>
              <KeyRound size={16} />
              <span style={{ fontSize: 13.5, fontWeight: 800 }}>חיפוש מורה ישיר (Direct Tutor)</span>
            </div>
            <input
              disabled
              placeholder="קוד / שם מורה"
              style={{ width: '100%', marginTop: 10, padding: '10px 12px', borderRadius: sb.radiusSmall, background: sb.glassSoft, border: `1px solid ${sb.borderMuted}`, color: sb.textMuted, fontFamily: sb.fontUi, fontSize: 13.5, outline: 'none' }}
            />
            <p style={{ margin: '10px 0 0', fontSize: 12, color: sb.textMuted, lineHeight: 1.6 }}>בקרוב — קביעת שיעור ישירה לפי קוד מורה, ללא תהליך התאמה.</p>
          </BentoCard>

          {error && <div style={{ gridColumn: '1 / -1', color: sb.error, fontSize: 13 }}>{error}</div>}
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 4 }}>
          <DualRangeSlider min={0} max={500} step={10} valueMin={budgetMin} valueMax={budgetMax} onChangeMin={setBudgetMin} onChangeMax={setBudgetMax} formatValue={(v) => (v === 500 ? '₪500+' : `₪${v}`)} />
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 4 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PRESETS.map((p) => (
              <Chip key={p.id} label={p.label} onClick={() => applyPreset(p)} />
            ))}
          </div>
          <AvailabilityGrid selectedDays={days} selectedTimes={times} onChangeDays={setDays} onChangeTimes={setTimes} />
          {error && <div style={{ color: sb.error, fontSize: 13 }}>{error}</div>}
        </div>
      )}

      {step === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 4 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Chip label="מורה אישה" selected={soft.teacher_gender === 'female'} onClick={() => toggleGender('female')} />
            <Chip label="מורה גבר" selected={soft.teacher_gender === 'male'} onClick={() => toggleGender('male')} />
            <Chip label="קצב מהיר ותכלס" selected={!!soft.fast_pace} onClick={() => setSoft((s) => ({ ...s, fast_pace: !s.fast_pace }))} />
            <Chip label="ניסיון עם ADHD" selected={!!soft.adhd_experience} onClick={() => setSoft((s) => ({ ...s, adhd_experience: !s.adhd_experience }))} />
            <Chip label="גישה תומכת ומחזקת ביטחון" selected={!!soft.inclusive_approach} onClick={() => setSoft((s) => ({ ...s, inclusive_approach: !s.inclusive_approach }))} />
          </div>
          {error && <div style={{ color: sb.error, fontSize: 13 }}>{error}</div>}
        </div>
      )}
    </WizardShell>
  );
}

// ── Find-tutor-local --sb helpers ───────────────────────────────────────────
function Canvas({ children }: { children: ReactNode }) {
  return (
    <div dir="rtl" lang="he" style={{ minHeight: '100dvh', background: sb.bgCanvas }}>
      {children}
    </div>
  );
}

function GoalCard({ icon, label, selected, onClick }: { icon: ReactNode; label: string; selected: boolean; onClick: () => void }) {
  return (
    <BentoCard
      onClick={onClick}
      style={{
        cursor: 'pointer',
        padding: 14,
        border: `1px solid ${selected ? sb.active : sb.borderCyber}`,
        boxShadow: selected ? '0 0 12px var(--sb-hover-glow)' : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: selected ? sb.active : sb.textSecondary, display: 'flex' }}>{icon}</span>
        <span style={{ fontWeight: 700, color: sb.textPrimary, fontFamily: sb.fontUi }}>{label}</span>
      </div>
    </BentoCard>
  );
}

// Subject-step control: shows the current level/academic context (defaulted from the
// saved profile) and lets the student temporarily change it for THIS search only.
function LevelContextControl({
  level,
  editing,
  onToggle,
  onPick,
}: {
  level: string | null;
  editing: boolean;
  onToggle: () => void;
  onPick: (value: string) => void;
}) {
  const isAcademic = level === 'academic';
  const contextLabel = isAcademic ? 'הקשר אקדמי (Academic Context)' : 'רמה (Level)';
  const changeLabel = isAcademic ? 'החלפת הקשר אקדמי (Change academic context)' : 'החלפת רמה (Change level)';
  return (
    <BentoCard hover={false} style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: sb.textSecondary, fontSize: 13.5, fontWeight: 700 }}>
          <GraduationCap size={16} />
          {contextLabel}: <span style={{ color: sb.textPrimary }}>{levelLabel(level)}</span>
        </span>
        <button
          type="button"
          onClick={onToggle}
          style={{
            background: 'transparent',
            border: 'none',
            color: sb.active,
            fontFamily: sb.fontUi,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {editing ? 'סגירה (Close)' : changeLabel}
        </button>
      </div>
      {editing && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {LEVELS.map((l) => (
              <Chip key={l.value} label={`${l.he} (${l.en})`} selected={level === l.value} onClick={() => onPick(l.value)} />
            ))}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 12, color: sb.textMuted }}>השינוי זמני וחל על חיפוש זה בלבד.</p>
        </div>
      )}
    </BentoCard>
  );
}

function Chip({ label, selected, onClick }: { label: string; selected?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: 999,
        cursor: 'pointer',
        border: `1.5px solid ${selected ? sb.active : sb.borderMuted}`,
        background: selected ? sb.hoverGlow : 'transparent',
        color: selected ? sb.active : sb.textSecondary,
        fontFamily: sb.fontUi,
        fontSize: 13,
        fontWeight: 700,
        transition: 'border-color var(--sb-motion-base) ease-out, color var(--sb-motion-base) ease-out, background var(--sb-motion-base) ease-out',
      }}
    >
      {label}
    </button>
  );
}
