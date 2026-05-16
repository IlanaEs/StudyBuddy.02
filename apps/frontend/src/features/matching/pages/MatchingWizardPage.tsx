import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMatchingStore } from '../store/matchingStore';
import { WizardShell } from '../components/WizardShell';
import { WizardProgress } from '../components/WizardProgress';
import { WizardStepHeader } from '../components/WizardStepHeader';
import { WizardOptionCard } from '../components/WizardOptionCard';
import { WizardSummaryCard } from '../components/WizardSummaryCard';
import { subjectsByLevel, gradesByLevel } from '../data/mockSubjects';
import { mockMatches } from '../data/mockMatches';
import type { EducationLevel, LearningGoal, LocationPreference, TimeSlot } from '../types/matching.types';

const TOTAL_STEPS = 10;

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
const TIME_SLOTS: { value: TimeSlot; label: string }[] = [
  { value: 'morning', label: 'בוקר (08:00–12:00)' },
  { value: 'afternoon', label: 'צהריים (12:00–17:00)' },
  { value: 'evening', label: 'ערב (17:00–22:00)' },
];

const LEARNING_STYLES = [
  { value: 'structured', label: '📚 הסבר מסודר ויסודי' },
  { value: 'fast', label: '⚡ קצב מהיר ותכלס' },
  { value: 'practice', label: '🧠 הרבה תרגול מעשי' },
  { value: 'fun', label: '💬 ללמוד בכיף ובגובה העיניים' },
  { value: 'exam', label: '🎯 רק לעבור את המבחן בשלום!' },
];

const SOFT_PREFS_STUDENT = [
  { value: 'female_teacher', label: '👩‍🏫 מורה אישה' },
  { value: 'male_teacher', label: '👨‍🏫 מורה גבר' },
  { value: 'patient', label: '☕ מורה סבלני/ת ומכיל/ה' },
  { value: 'certified', label: '📜 מורה מוסמך/ת (בעל/ת תעודה)' },
];

const SOFT_PREFS_PARENT = [
  { value: 'adhd', label: '🧠 ניסיון מוכח עם קשב וריכוז (ADHD / לקויות למידה)' },
  { value: 'patient', label: '☕ גישה מכילה, סבלנית ותומכת במיוחד' },
  { value: 'certified', label: '📜 העדפה למורה בעל/ת תעודת הוראה רשמית' },
  { value: 'female_teacher', label: '👩‍🏫 העדפה למורה אישה' },
  { value: 'male_teacher', label: '👨‍🏫 העדפה למורה גבר' },
];

export function MatchingWizardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { step, intake, updateIntake, nextStep, prevStep, setStep, setMatchResults, setLoading, isLoading } = useMatchingStore();
  const [subjectSearch, setSubjectSearch] = useState('');
  const [freeTextSubject, setFreeTextSubject] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const role = searchParams.get('role');
    if (role === 'student' || role === 'parent') {
      updateIntake({ userContext: role });
      if (step === 0) setStep(2); // skip entry + user-context screens
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const isParent = intake.userContext === 'parent';
  const subjects = subjectsByLevel[intake.gradeLevel ?? 'elementary'] ?? [];
  const filteredSubjects = subjects.filter((s) => s.includes(subjectSearch));
  const grades = gradesByLevel[intake.gradeLevel ?? 'elementary'] ?? [];

  function validate(s: number): boolean {
    const e: Record<string, string> = {};
    if (s === 2 && !intake.fullName.trim()) e.fullName = 'נא להכניס שם';
    if (s === 3 && !intake.learningGoal) e.learningGoal = 'נא לבחור מטרה';
    if (s === 4 && !intake.gradeLevel) e.gradeLevel = 'נא לבחור רמה';
    if (s === 6 && !intake.subjectName) e.subjectName = 'נא לבחור מקצוע';
    if (s === 7 && intake.budgetMax === null) e.budget = 'נא לבחור תקציב';
    if (s === 8 && intake.preferredDays.length === 0) e.days = 'נא לסמן לפחות יום אחד';
    if (s === 8 && intake.locationPreference === null) e.location = 'נא לבחור מיקום';
    if (s === 8 && (intake.locationPreference === 'frontal' || intake.locationPreference === 'both') && !intake.city) e.city = 'נא להכניס עיר';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleNext() {
    if (!validate(step)) return;
    if (step === TOTAL_STEPS) {
      // Review → trigger match
      setLoading(true);
      await new Promise((r) => setTimeout(r, 2200));
      setMatchResults(mockMatches);
      setLoading(false);
      navigate('/onboarding/results');
    } else {
      nextStep();
    }
  }

  function toggleArray(arr: string[], val: string): string[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  // ── STEP 0: Entry screen ──────────────────────────────────────────
  if (step === 0) {
    return (
      <div dir="rtl" lang="he" className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-lg text-center">
          <div className="text-5xl mb-4">🎓</div>
          <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
            מצא את המורה המושלם/ת עבורך
          </h1>
          <p className="text-lg mb-2" style={{ color: 'var(--text-2)' }}>
            שאלון קצר של 2 דקות — ואנחנו נמצא לך בדיוק 3 מורים מתאימים.
          </p>
          <div className="flex justify-center gap-6 mb-8 mt-6">
            {[
              { icon: '🎯', text: '3 מורים מותאמים אישית' },
              { icon: '📅', text: 'זמינות אמיתית בלבד' },
              { icon: '⚡', text: 'בלי חיפוש אינסופי' },
            ].map((t) => (
              <div key={t.text} className="flex flex-col items-center gap-1">
                <span className="text-2xl">{t.icon}</span>
                <span className="text-xs text-center" style={{ color: 'var(--text-2)', maxWidth: 80 }}>{t.text}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => nextStep()}
            className="w-full max-w-xs py-4 font-bold rounded-2xl text-lg"
            style={{ background: 'var(--cyan)', color: '#0f4544', border: 'none', cursor: 'pointer' }}
          >
            בואו נתחיל ←
          </button>
        </div>
      </div>
    );
  }

  // ── STEP 1: User context ──────────────────────────────────────────
  if (step === 1) {
    return (
      <WizardShell>
        <WizardProgress current={1} total={TOTAL_STEPS} />
        <WizardStepHeader title="מי מחפש מורה?" />
        <WizardOptionCard emoji="🎒" label="אני התלמיד/ה" description="אני מחפש/ת מורה לעצמי" selected={intake.userContext === 'student'} onClick={() => { updateIntake({ userContext: 'student' }); nextStep(); }} />
        <WizardOptionCard emoji="👨‍👩‍👧" label="אני הורה" description="אני מחפש/ת מורה לילד/ה שלי" selected={intake.userContext === 'parent'} onClick={() => { updateIntake({ userContext: 'parent' }); nextStep(); }} />
      </WizardShell>
    );
  }

  // ── STEP 2: Name ──────────────────────────────────────────────────
  if (step === 2) {
    return (
      <WizardShell>
        <WizardProgress current={2} total={TOTAL_STEPS} />
        <WizardStepHeader
          title={isParent ? 'נעים להכיר! איך לקרוא לך?' : 'היי! נעים להכיר, איך קוראים לך?'}
        />
        <input
          type="text"
          placeholder={isParent ? 'השם המלא שלך...' : 'השם שלך כאן...'}
          value={intake.fullName}
          onChange={(e) => updateIntake({ fullName: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && void handleNext()}
          className="w-full p-3 rounded-xl mb-2"
          style={{
            background: 'var(--surface-2)',
            border: `1px solid ${errors.fullName ? 'var(--coral)' : 'var(--line-2)'}`,
            color: 'var(--text)',
            fontSize: 16,
            outline: 'none',
          }}
          autoFocus
        />
        {errors.fullName && <div style={{ color: 'var(--coral)', fontSize: 13, marginBottom: 8 }}>{errors.fullName}</div>}
        <div className="flex gap-3 mt-4">
          <button onClick={prevStep} className="py-3 px-5 rounded-xl font-medium" style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--line-2)', cursor: 'pointer' }}>← חזור</button>
          <button onClick={() => void handleNext()} className="flex-1 py-3 font-bold rounded-xl" style={{ background: 'var(--cyan)', color: '#0f4544', border: 'none', cursor: 'pointer' }}>המשך ←</button>
        </div>
      </WizardShell>
    );
  }

  // ── STEP 3: Goal ──────────────────────────────────────────────────
  if (step === 3) {
    const studentGoals = [
      { value: 'single_session', emoji: '⚡', label: 'שיעור חד-פעמי', desc: 'לסגור פינה או להבין נושא ספציפי' },
      { value: 'ongoing', emoji: '🗓️', label: 'מורה קבוע/ה', desc: 'ליווי שבועי קבוע להעלאת הציונים' },
      { value: 'exam_prep', emoji: '🔥', label: 'מרתון לפני מבחן', desc: 'אינטנסיבי, כדי לעבור את המבחן הקרוב' },
    ];
    const parentGoals = [
      { value: 'ongoing', emoji: '📅', label: 'ליווי קבוע ומתמשך', desc: 'חיזוק הביטחון העצמי והעלאת הציונים לאורך השנה' },
      { value: 'single_session', emoji: '🎯', label: 'שיעור ממוקד/חד-פעמי', desc: 'להבנת נושא ספציפי או עזרה במטלה מסוימת' },
      { value: 'exam_prep', emoji: '🔥', label: 'הכנה מרוכזת למבחן', desc: 'תוכנית אינטנסיבית לקראת בחינה קרובה' },
    ];
    const goals = isParent ? parentGoals : studentGoals;
    return (
      <WizardShell>
        <WizardProgress current={3} total={TOTAL_STEPS} />
        <WizardStepHeader title={intake.fullName ? `${intake.fullName}, ${isParent ? 'מהו סוג הליווי הדרוש לילד/ה?' : 'מה היעד שלנו הפעם?'}` : (isParent ? 'מהו סוג הליווי הדרוש לילד/ה?' : 'מה היעד שלנו הפעם?')} />
        {goals.map((g) => (
          <WizardOptionCard key={g.value} emoji={g.emoji} label={g.label} description={g.desc} selected={intake.learningGoal === g.value} onClick={() => { updateIntake({ learningGoal: g.value as LearningGoal }); nextStep(); }} />
        ))}
        <button onClick={prevStep} className="mt-2 text-sm" style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>← חזור</button>
      </WizardShell>
    );
  }

  // ── STEP 4: Level ─────────────────────────────────────────────────
  if (step === 4) {
    const studentLevels = [
      { value: 'elementary', label: 'יסודי' },
      { value: 'middle', label: 'חטיבה' },
      { value: 'high', label: 'תיכון' },
      { value: 'academic', label: 'אקדמיה' },
    ];
    const parentLevels = [
      { value: 'elementary', label: 'בית ספר יסודי' },
      { value: 'middle', label: 'חטיבת ביניים' },
      { value: 'high', label: 'חטיבה עליונה / תיכון' },
    ];
    const levels = isParent ? parentLevels : studentLevels;
    return (
      <WizardShell>
        <WizardProgress current={4} total={TOTAL_STEPS} />
        <WizardStepHeader title={isParent ? 'מהי שכבת הגיל של הילד/ה?' : 'באיזו רמה הלימודים?'} />
        {levels.map((l) => (
          <WizardOptionCard key={l.value} label={l.label} selected={intake.gradeLevel === l.value} onClick={() => { updateIntake({ gradeLevel: l.value as EducationLevel }); nextStep(); }} />
        ))}
        {isParent && <div className="mt-3 p-3 rounded-lg text-sm" style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}>🛡️ המערכת תסנן באופן אוטומטי אך ורק מורים מנוסים ומוסמכים לשכבת הגיל הזו.</div>}
        <button onClick={prevStep} className="mt-2 text-sm" style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>← חזור</button>
      </WizardShell>
    );
  }

  // ── STEP 5: Sub-level ─────────────────────────────────────────────
  if (step === 5) {
    const isAcademic = intake.gradeLevel === 'academic';
    return (
      <WizardShell>
        <WizardProgress current={5} total={TOTAL_STEPS} />
        <WizardStepHeader title={isAcademic ? 'באיזו שנה?' : (isParent ? 'באיזו כיתה הילד/ה לומד/ת?' : 'באיזו כיתה?')} />
        <div className="flex flex-wrap gap-2">
          {grades.map((g) => (
            <button
              key={g}
              onClick={() => { updateIntake({ subLevel: g }); nextStep(); }}
              className="px-4 py-2 rounded-xl font-medium"
              style={{
                background: intake.subLevel === g ? 'var(--cyan)' : 'var(--surface-2)',
                color: intake.subLevel === g ? '#0f4544' : 'var(--text)',
                border: `1px solid ${intake.subLevel === g ? 'var(--cyan)' : 'var(--line-2)'}`,
                cursor: 'pointer',
                fontSize: 15,
              }}
            >
              {g}
            </button>
          ))}
        </div>
        <button onClick={prevStep} className="mt-4 text-sm" style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>← חזור</button>
      </WizardShell>
    );
  }

  // ── STEP 6: Subject ───────────────────────────────────────────────
  if (step === 6) {
    return (
      <WizardShell>
        <WizardProgress current={6} total={TOTAL_STEPS} />
        <WizardStepHeader title={isParent ? 'עבור איזה מקצוע נדרש הסיוע?' : 'איזה מקצוע או קורס צריך חיזוק?'} />
        {!freeTextSubject ? (
          <>
            <input
              type="text"
              placeholder="חיפוש מקצוע..."
              value={subjectSearch}
              onChange={(e) => setSubjectSearch(e.target.value)}
              className="w-full p-3 rounded-xl mb-3"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--line-2)', color: 'var(--text)', fontSize: 15, outline: 'none' }}
            />
            <div className="max-h-48 overflow-y-auto flex flex-col gap-1 mb-3">
              {filteredSubjects.map((s) => (
                <button
                  key={s}
                  onClick={() => { updateIntake({ subjectName: s, subjectId: s }); nextStep(); }}
                  className="text-right p-2 rounded-lg text-sm"
                  style={{
                    background: intake.subjectName === s ? 'color-mix(in oklab, var(--cyan) 15%, var(--surface-2))' : 'var(--surface-2)',
                    border: `1px solid ${intake.subjectName === s ? 'var(--cyan)' : 'var(--line-2)'}`,
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="text-sm mb-3" style={{ color: 'var(--text-3)' }}>🔍 לא מצאת את הקורס הספציפי שלך?{' '}<button onClick={() => setFreeTextSubject(true)} style={{ color: 'var(--cyan)', background: 'none', border: 'none', cursor: 'pointer' }}>לחץ/י כאן להקלדה חופשית</button></div>
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="הקלידו את שם הקורס (למשל: מבוא לכלכלה א׳) — אנחנו נדאג להתאים מורה מומחה."
              value={intake.subjectName}
              onChange={(e) => updateIntake({ subjectName: e.target.value, subjectId: e.target.value })}
              className="w-full p-3 rounded-xl mb-3"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--line-2)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
              autoFocus
            />
            <button onClick={() => setFreeTextSubject(false)} className="text-sm mb-3" style={{ color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>← חזור לרשימה</button>
          </>
        )}
        {errors.subjectName && <div style={{ color: 'var(--coral)', fontSize: 13, marginBottom: 8 }}>{errors.subjectName}</div>}
        <div className="flex gap-3 mt-2">
          <button onClick={prevStep} className="py-3 px-5 rounded-xl font-medium" style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--line-2)', cursor: 'pointer' }}>← חזור</button>
          <button onClick={() => void handleNext()} className="flex-1 py-3 font-bold rounded-xl" style={{ background: 'var(--cyan)', color: '#0f4544', border: 'none', cursor: 'pointer' }}>המשך ←</button>
        </div>
      </WizardShell>
    );
  }

  // ── STEP 7: Budget ────────────────────────────────────────────────
  if (step === 7) {
    const budgets = [
      { label: isParent ? '💵 עד ₪100 לשעה' : 'עד ₪100 / שעה', min: 0, max: 100 },
      { label: isParent ? '💳 ₪100 - ₪150 לשעה' : '₪100 - ₪150 / שעה', min: 100, max: 150 },
      { label: isParent ? '💎 ₪150+ לשעה' : '₪150+ / שעה', min: 150, max: 999 },
    ];
    return (
      <WizardShell>
        <WizardProgress current={7} total={TOTAL_STEPS} />
        <WizardStepHeader title={isParent ? 'מהו תקציב היעד שלכם עבור שעת שיעור?' : 'מה הטווח שלך לשיעור?'} />
        {budgets.map((b) => (
          <WizardOptionCard key={b.label} label={b.label} selected={intake.budgetMax === b.max} onClick={() => { updateIntake({ budgetMin: b.min, budgetMax: b.max }); nextStep(); }} />
        ))}
        {errors.budget && <div style={{ color: 'var(--coral)', fontSize: 13 }}>{errors.budget}</div>}
        <button onClick={prevStep} className="mt-2 text-sm" style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>← חזור</button>
      </WizardShell>
    );
  }

  // ── STEP 8: Availability + Location ──────────────────────────────
  if (step === 8) {
    return (
      <WizardShell>
        <WizardProgress current={8} total={TOTAL_STEPS} />
        <WizardStepHeader title={isParent ? 'באילו ימים ושעות הילד/ה פנוי/ה לשיעור?' : 'מתי הכי נוח לך ללמוד?'} subtitle="קליק מהיר על הימים והשעות המועדפים" />

        <div className="mb-4">
          <div className="font-semibold mb-2" style={{ color: 'var(--text-2)', fontSize: 14 }}>ימים מועדפים:</div>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <button key={d} onClick={() => updateIntake({ preferredDays: toggleArray(intake.preferredDays, d) })}
                className="px-3 py-1 rounded-lg text-sm font-medium"
                style={{ background: intake.preferredDays.includes(d) ? 'var(--cyan)' : 'var(--surface-2)', color: intake.preferredDays.includes(d) ? '#0f4544' : 'var(--text)', border: `1px solid ${intake.preferredDays.includes(d) ? 'var(--cyan)' : 'var(--line-2)'}`, cursor: 'pointer' }}>
                {d}
              </button>
            ))}
          </div>
          {errors.days && <div style={{ color: 'var(--coral)', fontSize: 13, marginTop: 4 }}>{errors.days}</div>}
        </div>

        <div className="mb-4">
          <div className="font-semibold mb-2" style={{ color: 'var(--text-2)', fontSize: 14 }}>שעות מועדפות:</div>
          <div className="flex flex-col gap-2">
            {TIME_SLOTS.map((ts) => (
              <button key={ts.value} onClick={() => updateIntake({ preferredTimeRanges: toggleArray(intake.preferredTimeRanges as string[], ts.value) as TimeSlot[] })}
                className="text-right px-3 py-2 rounded-lg text-sm"
                style={{ background: intake.preferredTimeRanges.includes(ts.value) ? 'color-mix(in oklab, var(--cyan) 15%, var(--surface-2))' : 'var(--surface-2)', border: `1px solid ${intake.preferredTimeRanges.includes(ts.value) ? 'var(--cyan)' : 'var(--line-2)'}`, color: 'var(--text)', cursor: 'pointer' }}>
                {ts.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="font-semibold mb-2" style={{ color: 'var(--text-2)', fontSize: 14 }}>סוג שיעור:</div>
          <div className="flex flex-col gap-2">
            {[{ value: 'online', label: '💻 אונליין' }, { value: 'frontal', label: '🏠 פרונטלי (פנים אל פנים)' }, { value: 'both', label: '↔️ שניהם' }].map((loc) => (
              <button key={loc.value} onClick={() => updateIntake({ locationPreference: loc.value as LocationPreference })}
                className="text-right px-3 py-2 rounded-lg text-sm"
                style={{ background: intake.locationPreference === loc.value ? 'color-mix(in oklab, var(--cyan) 15%, var(--surface-2))' : 'var(--surface-2)', border: `1px solid ${intake.locationPreference === loc.value ? 'var(--cyan)' : 'var(--line-2)'}`, color: 'var(--text)', cursor: 'pointer' }}>
                {loc.label}
              </button>
            ))}
          </div>
          {errors.location && <div style={{ color: 'var(--coral)', fontSize: 13, marginTop: 4 }}>{errors.location}</div>}
        </div>

        {(intake.locationPreference === 'frontal' || intake.locationPreference === 'both') && (
          <div className="mb-4">
            <div className="font-semibold mb-2" style={{ color: 'var(--text-2)', fontSize: 14 }}>עיר:</div>
            <input type="text" placeholder="הכנס/י עיר..." value={intake.city} onChange={(e) => updateIntake({ city: e.target.value })}
              className="w-full p-3 rounded-xl"
              style={{ background: 'var(--surface-2)', border: `1px solid ${errors.city ? 'var(--coral)' : 'var(--line-2)'}`, color: 'var(--text)', fontSize: 15, outline: 'none' }} />
            {errors.city && <div style={{ color: 'var(--coral)', fontSize: 13, marginTop: 4 }}>{errors.city}</div>}
          </div>
        )}

        {isParent && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}>🕒 אנו נציג אך ורק מורים שפנויים באופן ודאי בחלונות הזמן שתגדירו. אין צורך בטלפונים, בירורים או תיאומים מורכבים.</div>}

        <div className="flex gap-3 mt-2">
          <button onClick={prevStep} className="py-3 px-5 rounded-xl font-medium" style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--line-2)', cursor: 'pointer' }}>← חזור</button>
          <button onClick={() => void handleNext()} className="flex-1 py-3 font-bold rounded-xl" style={{ background: 'var(--cyan)', color: '#0f4544', border: 'none', cursor: 'pointer' }}>המשך ←</button>
        </div>
      </WizardShell>
    );
  }

  // ── STEP 9: Learning Style + Soft Preferences ─────────────────────
  if (step === 9) {
    const softPrefs = isParent ? SOFT_PREFS_PARENT : SOFT_PREFS_STUDENT;
    return (
      <WizardShell>
        <WizardProgress current={9} total={TOTAL_STEPS} />
        <WizardStepHeader
          title={isParent ? 'האם ישנם דגשים מיוחדים?' : 'בוא/י נדייק את הכימיה. מה חשוב לך במורה?'}
          subtitle={isParent ? 'סמנו קריטריונים שיעזרו לנו למצוא את המורה בעל הגישה המתאימה ביותר.' : 'אופציונלי'}
        />

        {!isParent && (
          <div className="mb-5">
            <div className="font-semibold mb-2" style={{ color: 'var(--text-2)', fontSize: 14 }}>סגנון למידה:</div>
            <div className="flex flex-col gap-2">
              {LEARNING_STYLES.map((ls) => (
                <button key={ls.value} onClick={() => updateIntake({ learningStyle: toggleArray(intake.learningStyle, ls.value) })}
                  className="text-right px-3 py-2 rounded-lg text-sm"
                  style={{ background: intake.learningStyle.includes(ls.value) ? 'color-mix(in oklab, var(--cyan) 15%, var(--surface-2))' : 'var(--surface-2)', border: `1px solid ${intake.learningStyle.includes(ls.value) ? 'var(--cyan)' : 'var(--line-2)'}`, color: 'var(--text)', cursor: 'pointer' }}>
                  {ls.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="font-semibold mb-2" style={{ color: 'var(--text-2)', fontSize: 14 }}>העדפות נוספות:</div>
          <div className="flex flex-col gap-2">
            {softPrefs.map((sp) => (
              <button key={sp.value} onClick={() => updateIntake({ softPreferences: toggleArray(intake.softPreferences, sp.value) })}
                className="text-right px-3 py-2 rounded-lg text-sm"
                style={{ background: intake.softPreferences.includes(sp.value) ? 'color-mix(in oklab, var(--cyan) 15%, var(--surface-2))' : 'var(--surface-2)', border: `1px solid ${intake.softPreferences.includes(sp.value) ? 'var(--cyan)' : 'var(--line-2)'}`, color: 'var(--text)', cursor: 'pointer' }}>
                {sp.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <button onClick={prevStep} className="py-3 px-5 rounded-xl font-medium" style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--line-2)', cursor: 'pointer' }}>← חזור</button>
          <button onClick={() => void handleNext()} className="flex-1 py-3 font-bold rounded-xl" style={{ background: 'var(--cyan)', color: '#0f4544', border: 'none', cursor: 'pointer' }}>המשך ←</button>
        </div>
      </WizardShell>
    );
  }

  // ── STEP 10: Review / Summary ─────────────────────────────────────
  const levelLabels: Record<string, string> = { elementary: 'יסודי', middle: 'חטיבה', high: 'תיכון', academic: 'אקדמיה' };
  const goalLabels: Record<string, string> = { single_session: 'שיעור חד-פעמי', ongoing: 'מורה קבוע', exam_prep: 'מרתון לבחינה' };
  const locationLabels: Record<string, string> = { online: 'אונליין', frontal: 'פרונטלי', both: 'אונליין + פרונטלי' };

  if (isLoading) {
    return <MatchingLoadingScreen name={intake.fullName} />;
  }

  return (
    <WizardShell>
      <WizardProgress current={10} total={TOTAL_STEPS} />
      <WizardStepHeader title="נראה לך הכל בסדר?" subtitle="בדוק/י את הפרטים לפני שנמצא לך מורה" />

      <WizardSummaryCard items={[
        { label: 'שם', value: intake.fullName },
        { label: 'יעד', value: goalLabels[intake.learningGoal ?? ''] ?? '' },
        { label: 'רמה', value: `${levelLabels[intake.gradeLevel ?? '']} ${intake.subLevel}` },
        { label: 'מקצוע', value: intake.subjectName },
        { label: 'תקציב', value: intake.budgetMax === 100 ? 'עד ₪100' : intake.budgetMax === 150 ? '₪100–₪150' : '₪150+' },
        { label: 'ימים', value: intake.preferredDays.join(', ') || '—' },
        { label: 'שעות', value: intake.preferredTimeRanges.map((t) => ({ morning: 'בוקר', afternoon: 'צהריים', evening: 'ערב' } as Record<TimeSlot, string>)[t]).join(', ') || '—' },
        { label: 'מיקום', value: locationLabels[intake.locationPreference ?? ''] ?? '—' },
        ...(intake.city ? [{ label: 'עיר', value: intake.city }] : []),
      ]} onEdit={() => setStep(2)} />

      <div className="flex gap-3 mt-4">
        <button onClick={prevStep} className="py-3 px-5 rounded-xl font-medium" style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--line-2)', cursor: 'pointer' }}>← חזור</button>
        <button onClick={() => void handleNext()} className="flex-1 py-4 font-bold rounded-xl text-lg" style={{ background: 'var(--cyan)', color: '#0f4544', border: 'none', cursor: 'pointer' }}>
          מצאו לי מורים ←
        </button>
      </div>
    </WizardShell>
  );
}

// Loading screen component used during matching
function MatchingLoadingScreen({ name }: { name: string }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const messages = [
    `מנתחים את הדרישות והיעדים הלימודיים של ${name || 'התלמיד'}...`,
    'מסננים מורים פעילים ומאומתים בלבד במערכת...',
    'מצליבים חלונות זמינות וטווחי תקציב מבוקשים...',
    'מבצעים אופטימיזציה ומייצרים את ה-Top 3 המדויק עבורך...',
  ];

  useEffect(() => {
    const interval = setInterval(() => setMsgIdx((i) => (i + 1) % messages.length), 550);
    return () => clearInterval(interval);
  // messages.length is stable (constant array), safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div dir="rtl" lang="he" className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="text-5xl mb-6 animate-spin" style={{ animationDuration: '2s' }}>🔍</div>
      <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)', textAlign: 'center' }}>מוצאים את ה-Top 3 שלך...</h2>
      <p className="text-center mb-8 max-w-xs" style={{ color: 'var(--text-2)', minHeight: 44 }}>{messages[msgIdx]}</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {['בודקים התאמת מקצוע', 'בודקים זמינות', 'בודקים טווח מחיר', 'מייצרים Top 3 מורים'].map((loadingStep, i) => (
          <div key={loadingStep} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--line-2)' }}>
            <span style={{ color: i <= msgIdx ? 'var(--lime)' : 'var(--text-3)', fontSize: 18 }}>{i <= msgIdx ? '✓' : '○'}</span>
            <span style={{ color: i <= msgIdx ? 'var(--text)' : 'var(--text-3)', fontSize: 14 }}>{loadingStep}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
