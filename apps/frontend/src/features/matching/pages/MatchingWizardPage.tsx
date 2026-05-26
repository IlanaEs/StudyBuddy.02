import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Users, Target, Calendar, Zap, Repeat, BookOpen,
  ShieldCheck, Search, Monitor, Home, ArrowLeftRight, Clock,
  Loader2, Check, Circle, Mail, Lock, Eye, EyeOff, CalendarDays,
  Sparkles,
} from 'lucide-react';
import { useMatchingStore } from '../store/matchingStore';
import { WizardShell } from '../components/WizardShell';
import { WizardProgress } from '../components/WizardProgress';
import { WizardStepHeader } from '../components/WizardStepHeader';
import { WizardOptionCard } from '../components/WizardOptionCard';
import { WizardSummaryCard } from '../components/WizardSummaryCard';
import { DualRangeSlider } from '../components/DualRangeSlider';
import { AvailabilityGrid } from '../components/AvailabilityGrid';
import { subjectsByLevel, gradesByLevel } from '../data/mockSubjects';
import { mockMatches } from '../data/mockMatches';
import type { EducationLevel, LearningGoal, LocationPreference, TimeSlot } from '../types/matching.types';
import { useAuth } from '../../../auth/AuthProvider';
import { getSupabaseBrowserClient } from '../../../auth/supabaseClient';
import { completeOAuthSignup, createStudentProfile, createStudentIntake } from '../../../api/students';
import {
  syncStudentCalendarAvailability,
  initiateCalendarOAuth,
  GCAL_SYNC_RETURN_KEY,
} from '../../../api/studentCalendar';
import { consumeEarlyProviderToken } from '../../../auth/supabaseClient';

const TOTAL_STEPS = 10;
const AUTH_STEP = 2;
const OAUTH_PENDING_KEY = 'sb_student_onboarding_oauth_pending';

const BUDGET_MIN = 0;
const BUDGET_MAX = 500;
const BUDGET_DEFAULT_MIN = 60;
const BUDGET_DEFAULT_MAX = 250;

const DAY_TO_INDEX: Record<string, number> = {
  ראשון: 0,
  שני: 1,
  שלישי: 2,
  רביעי: 3,
  חמישי: 4,
  שישי: 5,
};
const TIME_RANGE_TO_HOURS: Record<TimeSlot, { start: string; end: string }> = {
  morning: { start: '08:00', end: '12:00' },
  afternoon: { start: '12:00', end: '17:00' },
  evening: { start: '17:00', end: '22:00' },
};
const TIME_SLOTS: { value: TimeSlot; label: string }[] = [
  { value: 'morning', label: 'בוקר (08:00–12:00)' },
  { value: 'afternoon', label: 'צהריים (12:00–17:00)' },
  { value: 'evening', label: 'ערב (17:00–22:00)' },
];

const LEARNING_STYLES = [
  { value: 'structured', label: 'הסבר מסודר ויסודי' },
  { value: 'fast', label: 'קצב מהיר ותכלס' },
  { value: 'practice', label: 'הרבה תרגול מעשי' },
  { value: 'fun', label: 'ללמוד בכיף ובגובה העיניים' },
  { value: 'exam', label: 'רק לעבור את המבחן בשלום' },
];

const SOFT_PREFS_STUDENT = [
  { value: 'female_teacher', label: 'מורה אישה' },
  { value: 'male_teacher', label: 'מורה גבר' },
  { value: 'patient', label: 'מורה סבלני/ת ומכיל/ה' },
  { value: 'certified', label: 'מורה מוסמך/ת (בעל/ת תעודה)' },
];

const SOFT_PREFS_PARENT = [
  { value: 'adhd', label: 'ניסיון מוכח עם קשב וריכוז (ADHD / לקויות למידה)' },
  { value: 'patient', label: 'גישה מכילה, סבלנית ותומכת במיוחד' },
  { value: 'certified', label: 'העדפה למורה בעל/ת תעודת הוראה רשמית' },
  { value: 'female_teacher', label: 'העדפה למורה אישה' },
  { value: 'male_teacher', label: 'העדפה למורה גבר' },
];

function toHebrewOnboardingError(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const lower = message.toLowerCase();

  if (!message) return 'שגיאה. נסו שנית.';
  if (message === 'CHECK_EMAIL') return 'שלחנו אליך מייל לאישור החשבון. לאחר האישור ניתן להתחבר ולהמשיך.';
  if (lower.includes('failed to fetch') || lower.includes('network')) return 'לא הצלחנו להתחבר לשרת. בדקו חיבור ונסו שוב.';
  if (lower.includes('invalid email') || lower.includes('invalid login') || lower.includes('password')) return 'האימייל או הסיסמה אינם תקינים.';
  if (lower.includes('too many')) return 'בוצעו יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.';
  if (lower.includes('child_name')) return 'יש להזין את שם הילד/ה.';
  if (lower.includes('full_name')) return 'יש להזין שם מלא.';
  if (lower.includes('subject')) return 'לא מצאנו את המקצוע שנבחר. נסו לבחור מקצוע מהרשימה.';
  if (message.includes('החשבון המחובר לא מתאים למסלול שנבחר.')) return 'החשבון המחובר לא מתאים למסלול שנבחר.';
  if (/^[\x00-\x7F\s.,'":;!?()/-]+$/.test(message)) return 'שגיאה. נסו שנית.';

  return message;
}

export function MatchingWizardPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const {
    step, intake, updateIntake, nextStep, prevStep, setStep,
    setMatchResults, setLoading, isLoading, restoreFromStorage, clearStorage,
  } = useMatchingStore();
  const [subjectSearch, setSubjectSearch] = useState('');
  const [freeTextSubject, setFreeTextSubject] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auth step local state
  const [authTab, setAuthTab] = useState<'signup' | 'login'>('signup');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const oauthReturnHandled = useRef(false);
  const calSyncReturnHandled = useRef(false);

  // Availability step state
  const [availMode, setAvailMode] = useState<'sync' | 'manual' | 'synced'>('sync');
  const [calSyncing, setCalSyncing] = useState(false);
  const [calSyncError, setCalSyncError] = useState<string | null>(null);
  const isParent = intake.accountType === 'parent_for_child';
  const expectedRole = intake.accountType === 'parent_for_child' ? 'parent' : 'student';
  const hasRoleConflict =
    auth.status === 'authenticated' &&
    !!intake.accountType &&
    auth.user?.role !== expectedRole;

  // ── Initial mount ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (step > TOTAL_STEPS) {
      useMatchingStore.getState().reset();
      setStep(1);
      return;
    }
    if (step === 0) {
      const restored = restoreFromStorage();
      if (!restored) setStep(1);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initialize budget defaults when entering step 7 ───────────────────────────
  useEffect(() => {
    if (step === 7 && intake.budgetMin === null) {
      updateIntake({ budgetMin: BUDGET_DEFAULT_MIN, budgetMax: BUDGET_DEFAULT_MAX });
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── OAuth return ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    if (oauthReturnHandled.current) return;
    const oauthPending = localStorage.getItem(OAUTH_PENDING_KEY);
    if (!oauthPending) return;

    oauthReturnHandled.current = true;
    localStorage.removeItem(OAUTH_PENDING_KEY);
    void handlePostOAuthReturn();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.status]);

  // ── Guard: unauthenticated user must not bypass auth step ─────────────────────
  useEffect(() => {
    if (auth.status === 'loading') return;
    if (step > AUTH_STEP && auth.status === 'unauthenticated') {
      setStep(AUTH_STEP);
    }
  }, [auth.status, step, setStep]);

  // ── Authenticated return/session restore: enforce selected account type ───────
  useEffect(() => {
    if (step !== AUTH_STEP) return;
    if (auth.status !== 'authenticated') return;
    if (!intake.accountType || !auth.session?.access_token) return;

    if (hasRoleConflict) {
      setAuthError('החשבון המחובר לא מתאים למסלול שנבחר.');
      return;
    }

    if (intake.studentId) {
      setStep(AUTH_STEP + 1);
      return;
    }

    if (isParent && !intake.childName.trim()) {
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    void createStudentProfile(
      {
        account_type: intake.accountType,
        full_name: intake.fullName || auth.user?.full_name,
        grade_level: intake.gradeLevel ?? null,
        ...(isParent && intake.childName ? { child_name: intake.childName } : {}),
      },
      auth.session.access_token,
    ).then((profileResult) => {
      if ('error' in profileResult) {
        setAuthError(toHebrewOnboardingError(profileResult.error));
        return;
      }
      updateIntake({ studentId: profileResult.data.student_id });
      setStep(AUTH_STEP + 1);
    }).catch(() => {
      setAuthError('שגיאה בעיבוד החשבון. נסו שנית.');
    }).finally(() => {
      setAuthLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.status, step, intake.accountType, intake.studentId]);

  // ── Calendar OAuth return: detect return, consume provider token, call backend ─
  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    if (calSyncReturnHandled.current) return;
    if (!localStorage.getItem(GCAL_SYNC_RETURN_KEY)) return;

    calSyncReturnHandled.current = true;
    localStorage.removeItem(GCAL_SYNC_RETURN_KEY);

    const providerToken =
      consumeEarlyProviderToken() ??
      // Fallback: Supabase session may carry provider_token after re-auth
      (auth.session as { provider_token?: string } | null)?.provider_token;

    if (!providerToken || !auth.session?.access_token) {
      setCalSyncError('לא ניתן היה לקרוא את היומן. נסה/י שוב או בחר/י ידנית.');
      setAvailMode('manual');
      setCalSyncing(false);
      return;
    }

    setCalSyncing(true);
    setCalSyncError(null);
    void doCalendarSync(auth.session.access_token, providerToken);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.status]);

  // ── Perform the actual backend call + update intake ───────────────────────────
  async function doCalendarSync(accessToken: string, providerToken: string) {
    try {
      const result = await syncStudentCalendarAvailability(accessToken, providerToken);
      updateIntake({
        preferredDays: result.preferredDays,
        preferredTimeRanges: result.preferredTimeRanges as TimeSlot[],
      });
      setAvailMode('synced');
      setCalSyncError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'שגיאה בסנכרון';
      if (msg.includes('401') || msg.toLowerCase().includes('expired')) {
        setCalSyncError('פג תוקף ההרשאה לגוגל קאלנדר. לחץ/י שוב לחיבור מחדש.');
      } else if (msg.includes('403') || msg.toLowerCase().includes('permission')) {
        setCalSyncError('אין גישה ליומן. ודא/י שאישרת את הגישה ל-Google Calendar.');
      } else {
        setCalSyncError('לא הצלחנו לקרוא את היומן. ניתן להמשיך ולסמן ידנית.');
      }
      setAvailMode('manual');
    } finally {
      setCalSyncing(false);
    }
  }

  // ── GCal sync: initiate OAuth → redirect → return handled by useEffect above ──
  async function handleCalSync() {
    setCalSyncing(true);
    setCalSyncError(null);
    try {
      localStorage.setItem(GCAL_SYNC_RETURN_KEY, '1');
      await initiateCalendarOAuth();
      // Page redirects to Google — execution does not continue here
    } catch (err) {
      localStorage.removeItem(GCAL_SYNC_RETURN_KEY);
      setCalSyncError(
        err instanceof Error && (err as { status?: number }).status === 403
          ? 'ההתחברות עם גוגל אינה מופעלת. נסה/י לסמן ידנית.'
          : 'שגיאה בחיבור לגוגל. נסה/י שוב.',
      );
      setCalSyncing(false);
      setAvailMode('manual');
    }
  }

  // ── Post-OAuth: set role, create student profile, advance ─────────────────────
  async function handlePostOAuthReturn() {
    if (!auth.session?.access_token) return;
    const savedAccountType = intake.accountType;
    if (!savedAccountType) return;

    setAuthLoading(true);
    setAuthError(null);
    try {
      const oauthResult = await completeOAuthSignup(
        savedAccountType,
        auth.user?.full_name ?? intake.fullName,
        auth.session.access_token,
      );
      if ('error' in oauthResult) {
        setAuthError(toHebrewOnboardingError(oauthResult.error));
        return;
      }

      const profileResult = await createStudentProfile(
        {
          account_type: savedAccountType,
          full_name: auth.user?.full_name ?? intake.fullName,
          grade_level: intake.gradeLevel ?? null,
          ...(savedAccountType === 'parent_for_child' && intake.childName ? { child_name: intake.childName } : {}),
        },
        auth.session.access_token,
      );
      if ('error' in profileResult) {
        setAuthError(toHebrewOnboardingError(profileResult.error));
        return;
      }

      updateIntake({ studentId: profileResult.data.student_id });
      setStep(AUTH_STEP + 1);
    } catch {
      setAuthError('שגיאה בעיבוד החשבון. נסו שנית.');
    } finally {
      setAuthLoading(false);
    }
  }

  // ── Email/password auth ───────────────────────────────────────────────────────
  async function handleEmailAuth() {
    setAuthError(null);
    if (!intake.accountType) {
      setAuthError('יש לבחור סוג חשבון לפני ההתחברות.');
      return;
    }
    if (hasRoleConflict) {
      setAuthError('החשבון המחובר לא מתאים למסלול שנבחר.');
      return;
    }
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('נא למלא אימייל וסיסמה');
      return;
    }
    if (authTab === 'signup' && !intake.fullName.trim()) {
      setAuthError('נא להכניס שם מלא');
      return;
    }
    if (authTab === 'signup' && authPassword.length < 8) {
      setAuthError('הסיסמה חייבת להכיל לפחות 8 תווים');
      return;
    }
    if (isParent && authTab === 'signup' && !intake.childName.trim()) {
      setAuthError('נא להכניס את שם הילד/ה');
      return;
    }
    setAuthLoading(true);
    try {
      if (authTab === 'signup') {
        await auth.signup({
          email: authEmail,
          full_name: intake.fullName,
          password: authPassword,
          role: expectedRole,
          account_type: intake.accountType,
        });
      } else {
        await auth.login({ email: authEmail, password: authPassword });
      }

      const supabase = getSupabaseBrowserClient();
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      if (freshSession?.access_token) {
        const profileResult = await createStudentProfile(
          {
            account_type: intake.accountType,
            full_name: intake.fullName,
            grade_level: intake.gradeLevel ?? null,
            ...(isParent && intake.childName ? { child_name: intake.childName } : {}),
          },
          freshSession.access_token,
        );
        if ('error' in profileResult) {
          setAuthError(toHebrewOnboardingError(profileResult.error));
          return;
        }
        updateIntake({ studentId: profileResult.data.student_id });
      }

      setStep(AUTH_STEP + 1);
    } catch (err) {
      setAuthError(toHebrewOnboardingError(err));
    } finally {
      setAuthLoading(false);
    }
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────────
  async function handleGoogleOAuth() {
    if (!intake.accountType) {
      setAuthError('יש לבחור סוג חשבון לפני ההתחברות.');
      return;
    }
    if (!intake.fullName.trim()) {
      setAuthError('נא להכניס שם מלא לפני ההתחברות עם גוגל');
      return;
    }
    if (isParent && !intake.childName.trim()) {
      setAuthError('נא להכניס את שם הילד/ה לפני ההתחברות עם גוגל');
      return;
    }
    try {
      localStorage.setItem('sb_student_onboarding', JSON.stringify({ step: AUTH_STEP, intake }));
    } catch { /* ignore */ }
    localStorage.setItem(OAUTH_PENDING_KEY, 'true');

    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/onboarding/matching` },
    });
  }

  // ── Submit: create intake + clear draft ───────────────────────────────────────
  async function submitIntake(): Promise<boolean> {
    const token = auth.session?.access_token;
    if (!token) {
      setStep(AUTH_STEP);
      return false;
    }
    if (!intake.studentId) {
      setErrors({ submit: 'לא נמצא פרופיל תלמיד משויך לחשבון. חזרו לשלב ההתחברות ונסו שוב.' });
      setStep(AUTH_STEP);
      return false;
    }
    const result = await createStudentIntake(
      {
        student_id: intake.studentId,
        subject_name: intake.subjectName,
        sub_level: intake.subLevel,
        learning_goal: intake.learningGoal,
        location_preference: (intake.locationPreference ?? 'online') as 'online' | 'frontal' | 'both',
        city: intake.city,
        budget_min: intake.budgetMin,
        budget_max: intake.budgetMax,
        preferred_days: intake.preferredDays.map((day) => DAY_TO_INDEX[day]).filter((day): day is number => typeof day === 'number'),
        preferred_time_ranges: intake.preferredTimeRanges.map((range) => TIME_RANGE_TO_HOURS[range]),
        learning_style: intake.learningStyle[0] ?? null,
      },
      token,
    );
    if ('error' in result) {
      setErrors({ submit: toHebrewOnboardingError(result.error) });
      return false;
    }
    clearStorage();
    localStorage.removeItem(OAUTH_PENDING_KEY);
    return true;
  }

  const subjects = subjectsByLevel[intake.gradeLevel ?? 'elementary'] ?? [];
  const filteredSubjects = subjects.filter((s) => s.includes(subjectSearch));
  const grades = gradesByLevel[intake.gradeLevel ?? 'elementary'] ?? [];

  function validate(s: number): boolean {
    const e: Record<string, string> = {};
    if (s === 1 && !intake.accountType) e.accountType = 'יש לבחור סוג חשבון.';
    if (s === 3 && !intake.learningGoal) e.learningGoal = 'נא לבחור מטרה';
    if (s === 4 && !intake.gradeLevel) e.gradeLevel = 'נא לבחור רמה';
    if (s === 6 && !intake.subjectName) e.subjectName = 'נא לבחור מקצוע';
    if (s === 8 && intake.preferredDays.length === 0) e.days = 'נא לסמן לפחות יום אחד';
    if (s === 8 && intake.locationPreference === null) e.location = 'נא לבחור מיקום';
    if (s === 8 && (intake.locationPreference === 'frontal' || intake.locationPreference === 'both') && !intake.city) e.city = 'נא להכניס עיר';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleNext() {
    if (!validate(step)) return;
    if (step === TOTAL_STEPS) {
      setLoading(true);
      const ok = await submitIntake();
      if (!ok) {
        setLoading(false);
        return;
      }
      await new Promise((r) => setTimeout(r, 1800));
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

  // ── Shared CTA button style ───────────────────────────────────────────────────
  const ctaPrimary: React.CSSProperties = {
    background: 'var(--cyan)',
    color: '#0f4544',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
  };

  const ctaBack: React.CSSProperties = {
    background: 'var(--surface-2)',
    color: 'var(--text-2)',
    border: '1px solid var(--line-2)',
    cursor: 'pointer',
  };

  // ── STEP 0: Entry screen ──────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <div dir="rtl" lang="he" className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-lg text-center">
          <div
            className="flex items-center justify-center w-20 h-20 rounded-2xl mx-auto mb-6"
            style={{
              background: 'color-mix(in oklab, var(--cyan) 15%, var(--surface))',
              color: 'var(--cyan)',
              boxShadow: '0 8px 32px -8px color-mix(in oklab, var(--cyan) 40%, transparent)',
            }}
          >
            <GraduationCap size={40} />
          </div>
          <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
            מצא את המורה המושלם/ת עבורך
          </h1>
          <p className="text-lg mb-2" style={{ color: 'var(--text-2)' }}>
            שאלון קצר של 2 דקות — ואנחנו נמצא לך בדיוק 3 מורים מתאימים.
          </p>
          <div className="flex justify-center gap-6 mb-8 mt-6">
            {[
              { icon: <Target size={22} />, text: '3 מורים מותאמים אישית' },
              { icon: <Calendar size={22} />, text: 'זמינות אמיתית בלבד' },
              { icon: <Zap size={22} />, text: 'בלי חיפוש אינסופי' },
            ].map((t) => (
              <div key={t.text} className="flex flex-col items-center gap-2">
                <span style={{ color: 'var(--cyan)' }}>{t.icon}</span>
                <span className="text-xs text-center" style={{ color: 'var(--text-2)', maxWidth: 80 }}>{t.text}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => nextStep()}
            className="w-full max-w-xs py-4 font-bold rounded-2xl text-lg wizard-cta-primary"
            style={ctaPrimary}
          >
            בואו נתחיל
          </button>
        </div>
      </div>
    );
  }

  // ── STEP 1: Account type ──────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <WizardShell step={step}>
        <WizardProgress current={1} total={TOTAL_STEPS} />
        <WizardStepHeader title="למי מיועד החשבון?" />
        <WizardOptionCard
          icon={<GraduationCap size={20} />}
          label="אני התלמיד/ה"
          description="אני מחפש/ת מורה עבור עצמי"
          selected={intake.accountType === 'independent_student'}
          onClick={() => { updateIntake({ accountType: 'independent_student', childName: '' }); setErrors({}); }}
        />
        <WizardOptionCard
          icon={<Users size={20} />}
          label="אני הורה / אחראי/ת עבור תלמיד"
          description="אני מחפש/ת מורה עבור ילד/ה או תלמיד/ה באחריותי"
          selected={intake.accountType === 'parent_for_child'}
          onClick={() => { updateIntake({ accountType: 'parent_for_child' }); setErrors({}); }}
        />
        {errors.accountType && <div style={{ color: 'var(--coral)', fontSize: 13, marginTop: 4 }}>{errors.accountType}</div>}
        <button onClick={() => void handleNext()} className="w-full py-3 rounded-xl mt-4 wizard-cta-primary" style={ctaPrimary}>
          המשך
        </button>
      </WizardShell>
    );
  }

  // ── STEP 3: Goal ──────────────────────────────────────────────────────────────
  if (step === 3) {
    const studentGoals = [
      { value: 'single_session', icon: <Zap size={18} />, label: 'שיעור חד-פעמי', desc: 'לסגור פינה או להבין נושא ספציפי' },
      { value: 'ongoing', icon: <Repeat size={18} />, label: 'מורה קבוע/ה', desc: 'ליווי שבועי קבוע להעלאת הציונים' },
      { value: 'exam_prep', icon: <BookOpen size={18} />, label: 'מרתון לפני מבחן', desc: 'אינטנסיבי, כדי לעבור את המבחן הקרוב' },
    ];
    const parentGoals = [
      { value: 'ongoing', icon: <Repeat size={18} />, label: 'ליווי קבוע ומתמשך', desc: 'חיזוק הביטחון העצמי והעלאת הציונים לאורך השנה' },
      { value: 'single_session', icon: <Target size={18} />, label: 'שיעור ממוקד/חד-פעמי', desc: 'להבנת נושא ספציפי או עזרה במטלה מסוימת' },
      { value: 'exam_prep', icon: <BookOpen size={18} />, label: 'הכנה מרוכזת למבחן', desc: 'תוכנית אינטנסיבית לקראת בחינה קרובה' },
    ];
    const goals = isParent ? parentGoals : studentGoals;
    return (
      <WizardShell step={step}>
        <WizardProgress current={3} total={TOTAL_STEPS} />
        <WizardStepHeader
          title={intake.fullName
            ? `${intake.fullName}, ${isParent ? 'מהו סוג הליווי הדרוש לילד/ה?' : 'מה היעד שלנו הפעם?'}`
            : (isParent ? 'מהו סוג הליווי הדרוש לילד/ה?' : 'מה היעד שלנו הפעם?')}
        />
        {goals.map((g) => (
          <WizardOptionCard
            key={g.value}
            icon={g.icon}
            label={g.label}
            description={g.desc}
            selected={intake.learningGoal === g.value}
            onClick={() => { updateIntake({ learningGoal: g.value as LearningGoal }); nextStep(); }}
          />
        ))}
        <button onClick={prevStep} className="mt-2 text-sm" style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>חזור</button>
      </WizardShell>
    );
  }

  // ── STEP 4: Level ─────────────────────────────────────────────────────────────
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
      <WizardShell step={step}>
        <WizardProgress current={4} total={TOTAL_STEPS} />
        <WizardStepHeader title={isParent ? 'מהי שכבת הגיל של הילד/ה?' : 'באיזו רמה הלימודים?'} />
        {levels.map((l) => (
          <WizardOptionCard
            key={l.value}
            label={l.label}
            selected={intake.gradeLevel === l.value}
            onClick={() => { updateIntake({ gradeLevel: l.value as EducationLevel }); nextStep(); }}
          />
        ))}
        {isParent && (
          <div className="mt-3 p-3 rounded-lg flex items-start gap-2 text-sm" style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}>
            <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: 1, color: 'var(--lime)' }} />
            <span>המערכת תסנן באופן אוטומטי אך ורק מורים מנוסים ומוסמכים לשכבת הגיל הזו.</span>
          </div>
        )}
        <button onClick={prevStep} className="mt-2 text-sm" style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>חזור</button>
      </WizardShell>
    );
  }

  // ── STEP 5: Sub-level ─────────────────────────────────────────────────────────
  if (step === 5) {
    const isAcademic = intake.gradeLevel === 'academic';
    return (
      <WizardShell step={step}>
        <WizardProgress current={5} total={TOTAL_STEPS} />
        <WizardStepHeader title={isAcademic ? 'באיזו שנה?' : (isParent ? 'באיזו כיתה הילד/ה לומד/ת?' : 'באיזו כיתה?')} />
        <div className="flex flex-wrap gap-2">
          {grades.map((g) => (
            <button
              key={g}
              onClick={() => { updateIntake({ subLevel: g }); nextStep(); }}
              className="px-4 py-2 rounded-xl font-medium wizard-cta-primary"
              style={{
                background: intake.subLevel === g ? 'var(--cyan)' : 'var(--surface-2)',
                color: intake.subLevel === g ? '#0f4544' : 'var(--text)',
                border: `1px solid ${intake.subLevel === g ? 'var(--cyan)' : 'var(--line-2)'}`,
                cursor: 'pointer',
                fontSize: 15,
                transition: 'background 0.15s, border-color 0.15s, color 0.15s',
              }}
            >
              {g}
            </button>
          ))}
        </div>
        <button onClick={prevStep} className="mt-4 text-sm" style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>חזור</button>
      </WizardShell>
    );
  }

  // ── STEP 6: Subject ───────────────────────────────────────────────────────────
  if (step === 6) {
    return (
      <WizardShell step={step}>
        <WizardProgress current={6} total={TOTAL_STEPS} />
        <WizardStepHeader title={isParent ? 'עבור איזה מקצוע נדרש הסיוע?' : 'איזה מקצוע או קורס צריך חיזוק?'} />
        {!freeTextSubject ? (
          <>
            <input
              type="text"
              placeholder="חיפוש מקצוע..."
              value={subjectSearch}
              onChange={(e) => setSubjectSearch(e.target.value)}
              className="w-full p-3 rounded-xl mb-3 wizard-input"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--line-2)', color: 'var(--text)', fontSize: 15, outline: 'none', transition: 'border-color 0.18s, box-shadow 0.18s' }}
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
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm mb-3" style={{ color: 'var(--text-3)' }}>
              <Search size={14} />
              <span>לא מצאת את הקורס הספציפי שלך?{' '}
                <button onClick={() => setFreeTextSubject(true)} style={{ color: 'var(--cyan)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  לחץ/י כאן להקלדה חופשית
                </button>
              </span>
            </div>
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="הקלידו את שם הקורס..."
              value={intake.subjectName}
              onChange={(e) => updateIntake({ subjectName: e.target.value, subjectId: e.target.value })}
              className="w-full p-3 rounded-xl mb-3 wizard-input"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--line-2)', color: 'var(--text)', fontSize: 14, outline: 'none', transition: 'border-color 0.18s, box-shadow 0.18s' }}
              autoFocus
            />
            <button onClick={() => setFreeTextSubject(false)} className="text-sm mb-3" style={{ color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>חזור לרשימה</button>
          </>
        )}
        {errors.subjectName && <div style={{ color: 'var(--coral)', fontSize: 13, marginBottom: 8 }}>{errors.subjectName}</div>}
        <div className="flex gap-3 mt-2">
          <button onClick={prevStep} className="py-3 px-5 rounded-xl font-medium" style={ctaBack}>חזור</button>
          <button onClick={() => void handleNext()} className="flex-1 py-3 rounded-xl wizard-cta-primary" style={ctaPrimary}>המשך</button>
        </div>
      </WizardShell>
    );
  }

  // ── STEP 7: Budget — Dual range slider ───────────────────────────────────────
  if (step === 7) {
    const sliderMin = intake.budgetMin ?? BUDGET_DEFAULT_MIN;
    const sliderMax = intake.budgetMax ?? BUDGET_DEFAULT_MAX;

    return (
      <WizardShell step={step}>
        <WizardProgress current={7} total={TOTAL_STEPS} />
        <WizardStepHeader
          title={isParent ? 'מהו תקציב היעד לשעת שיעור?' : 'מה הטווח שלך לשיעור?'}
          subtitle="גרור/י את הסמנים לקביעת טווח מחיר"
        />

        <div
          className="p-4 rounded-2xl mb-5"
          style={{
            background: 'color-mix(in oklab, var(--surface-2) 80%, transparent)',
            border: '1px solid color-mix(in oklab, var(--cyan) 15%, var(--line-2))',
            backdropFilter: 'blur(8px)',
          }}
        >
          <DualRangeSlider
            min={BUDGET_MIN}
            max={BUDGET_MAX}
            step={10}
            valueMin={sliderMin}
            valueMax={sliderMax}
            onChangeMin={(v) => updateIntake({ budgetMin: v })}
            onChangeMax={(v) => updateIntake({ budgetMax: v })}
            formatValue={(v) => v === BUDGET_MAX ? `₪${v}+` : `₪${v}`}
          />
        </div>

        <div className="flex gap-3">
          <button onClick={prevStep} className="py-3 px-5 rounded-xl font-medium" style={ctaBack}>חזור</button>
          <button onClick={() => void handleNext()} className="flex-1 py-3 rounded-xl wizard-cta-primary" style={ctaPrimary}>
            המשך לשמירת ההעדפות →
          </button>
        </div>
      </WizardShell>
    );
  }

  // ── STEP 2: Auth checkpoint ───────────────────────────────────────────────────
  if (step === AUTH_STEP) {
    if (authLoading) {
      return (
        <div dir="rtl" lang="he" className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
          <Loader2 size={40} className="animate-spin" style={{ color: 'var(--cyan)', marginBottom: 16 }} />
          <p style={{ color: 'var(--text-2)' }}>מגדירים את החשבון שלך...</p>
        </div>
      );
    }

    return (
      <WizardShell step={step}>
        <WizardProgress current={AUTH_STEP} total={TOTAL_STEPS} />
        <WizardStepHeader
          title={isParent ? 'צרו חשבון הורה' : 'צרו חשבון תלמיד/ה'}
          subtitle="אחרי ההתחברות נמשיך לשאלון ההתאמה"
        />

        {authTab === 'signup' && (
          <div className="mb-4">
            <div className="font-semibold mb-1 text-sm" style={{ color: 'var(--text-2)' }}>
              {isParent ? 'השם המלא שלך' : 'שם מלא'}
            </div>
            <input
              type="text"
              placeholder={isParent ? 'השם המלא שלך...' : 'השם שלך כאן...'}
              value={intake.fullName}
              onChange={(e) => updateIntake({ fullName: e.target.value })}
              className="w-full p-3 rounded-xl wizard-input"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--line-2)', color: 'var(--text)', fontSize: 15, outline: 'none', transition: 'border-color 0.18s, box-shadow 0.18s' }}
            />
          </div>
        )}

        {isParent && (
          <div className="mb-4">
            <div className="font-semibold mb-1 text-sm" style={{ color: 'var(--text-2)' }}>שם הילד/ה</div>
            <input
              type="text"
              placeholder="שם מלא של הילד/ה..."
              value={intake.childName}
              onChange={(e) => updateIntake({ childName: e.target.value })}
              className="w-full p-3 rounded-xl wizard-input"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--line-2)', color: 'var(--text)', fontSize: 15, outline: 'none', transition: 'border-color 0.18s, box-shadow 0.18s' }}
            />
          </div>
        )}

        <div className="flex mb-4 rounded-xl overflow-hidden" style={{ border: '1px solid var(--line-2)' }}>
          {(['signup', 'login'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setAuthTab(tab)}
              className="flex-1 py-2 text-sm font-medium"
              style={{
                background: authTab === tab ? 'var(--cyan)' : 'var(--surface-2)',
                color: authTab === tab ? '#0f4544' : 'var(--text-2)',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.18s, color 0.18s',
              }}
            >
              {tab === 'signup' ? 'יצירת חשבון' : 'כניסה קיימת'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 mb-4">
          <div className="relative">
            <Mail size={15} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
            <input
              type="email"
              placeholder="כתובת אימייל"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="w-full p-3 pr-9 rounded-xl wizard-input"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--line-2)', color: 'var(--text)', fontSize: 15, outline: 'none', transition: 'border-color 0.18s, box-shadow 0.18s' }}
              dir="ltr"
            />
          </div>
          <div className="relative">
            <Lock size={15} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={authTab === 'signup' ? 'סיסמה (לפחות 8 תווים)' : 'סיסמה'}
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleEmailAuth()}
              className="w-full p-3 pr-9 rounded-xl wizard-input"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--line-2)', color: 'var(--text)', fontSize: 15, outline: 'none', transition: 'border-color 0.18s, box-shadow 0.18s' }}
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 0 }}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {authError && (
          <div className="mb-3 p-3 rounded-lg text-sm" style={{ background: 'color-mix(in oklab, var(--coral) 15%, var(--surface-2))', color: 'var(--coral)', border: '1px solid color-mix(in oklab, var(--coral) 30%, transparent)' }}>
            {authError}
            {hasRoleConflict && (
              <div className="flex flex-col gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => void auth.logout()}
                  className="w-full py-2 rounded-lg font-semibold"
                  style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--line-2)', cursor: 'pointer' }}
                >
                  התנתקות ובחירת חשבון אחר
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="w-full py-2 rounded-lg font-semibold"
                  style={{ background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--line-2)', cursor: 'pointer' }}
                >
                  מעבר לאזור האישי המתאים
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => void handleEmailAuth()}
          className="w-full py-3 rounded-xl mb-3 wizard-cta-primary"
          style={{ ...ctaPrimary, fontSize: 16 }}
        >
          {authTab === 'signup' ? 'צרו חשבון' : 'כניסה'}
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px" style={{ background: 'var(--line-2)' }} />
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>או</span>
          <div className="flex-1 h-px" style={{ background: 'var(--line-2)' }} />
        </div>

        <button
          onClick={() => void handleGoogleOAuth()}
          className="w-full py-3 font-medium rounded-xl flex items-center justify-center gap-2 mb-4"
          style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--line-2)', cursor: 'pointer', fontSize: 15, transition: 'background 0.18s, border-color 0.18s' }}
        >
          <GoogleIcon />
          המשך עם גוגל
        </button>

        <button onClick={prevStep} className="w-full text-sm" style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>חזור</button>
      </WizardShell>
    );
  }

  // ── STEP 8: Availability — GCal sync or manual grid ───────────────────────────
  if (step === 8) {
    const locationOptions: { value: LocationPreference; label: string; icon: React.ReactNode }[] = [
      { value: 'online', label: 'אונליין', icon: <Monitor size={15} /> },
      { value: 'frontal', label: 'פרונטלי (פנים אל פנים)', icon: <Home size={15} /> },
      { value: 'both', label: 'שניהם', icon: <ArrowLeftRight size={15} /> },
    ];

    return (
      <WizardShell step={step}>
        <WizardProgress current={8} total={TOTAL_STEPS} />
        <WizardStepHeader
          title={isParent ? 'מתי הילד/ה פנוי/ה?' : 'מתי הכי נוח לך?'}
          subtitle="נציג רק מורים שפנויים בשעות שלך"
        />

        {/* ── Google Calendar sync card ───────────────────────────── */}
        {availMode !== 'synced' && (
          <div
            className="p-4 rounded-2xl mb-4"
            style={{
              background: 'color-mix(in oklab, var(--cyan) 8%, var(--surface-2))',
              border: '1px solid color-mix(in oklab, var(--cyan) 28%, var(--line-2))',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
                style={{
                  background: 'color-mix(in oklab, var(--cyan) 18%, var(--surface))',
                  color: 'var(--cyan)',
                }}
              >
                <CalendarDays size={20} />
              </div>
              <div>
                <div className="font-bold text-sm mb-0.5" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
                  ⚡ סנכרון מהיר (מומלץ)
                </div>
                <div style={{ color: 'var(--text-2)', fontSize: 12, lineHeight: 1.5 }}>
                  חיבור קליק אחד ל-Google Calendar יחסוך לך זמן, ימנע כפילויות, ויציג לך רק מורים שבאמת פנויים בלו״ז שלך.
                </div>
              </div>
            </div>

            <button
              onClick={() => void handleCalSync()}
              disabled={calSyncing}
              className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 wizard-cta-primary"
              style={{
                ...ctaPrimary,
                opacity: calSyncing ? 0.7 : 1,
                fontSize: 14,
              }}
            >
              {calSyncing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  מסנכרן עם יומן גוגל...
                </>
              ) : (
                <>
                  <CalendarDays size={16} />
                  חבר את יומן גוגל
                </>
              )}
            </button>

            {/* ── Calendar sync error ─────────────────────────────── */}
            {calSyncError && (
              <div
                className="mt-2 px-3 py-2 rounded-lg text-xs flex items-start gap-2"
                style={{
                  background: 'color-mix(in oklab, var(--coral) 10%, var(--surface-2))',
                  border: '1px solid color-mix(in oklab, var(--coral) 30%, var(--line-2))',
                  color: 'var(--coral)',
                }}
              >
                {calSyncError}
              </div>
            )}
          </div>
        )}

        {/* ── Synced success state ────────────────────────────────── */}
        {availMode === 'synced' && (
          <div
            className="p-4 rounded-2xl mb-4 flex items-center gap-3"
            style={{
              background: 'color-mix(in oklab, var(--lime) 10%, var(--surface-2))',
              border: '1px solid color-mix(in oklab, var(--lime) 35%, var(--line-2))',
            }}
          >
            <div
              className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
              style={{ background: 'color-mix(in oklab, var(--lime) 20%, var(--surface))', color: 'var(--lime)' }}
            >
              <Check size={18} />
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
                יומן גוגל מחובר
              </div>
              <div style={{ color: 'var(--text-3)', fontSize: 12 }}>
                זמינות זוהתה אוטומטית — ניתן לשנות ידנית למטה
              </div>
            </div>
            <button
              onClick={() => setAvailMode('manual')}
              style={{ marginRight: 'auto', color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}
            >
              ערוך
            </button>
          </div>
        )}

        {/* ── Manual link ─────────────────────────────────────────── */}
        {availMode === 'sync' && (
          <div className="text-center mb-4">
            <button
              onClick={() => setAvailMode('manual')}
              style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 13 }}
            >
              מעדיף/ת לסמן ידנית ללא חיבור יומן?
            </button>
          </div>
        )}

        {/* ── Manual grid ─────────────────────────────────────────── */}
        {(availMode === 'manual' || availMode === 'synced') && (
          <div className="mb-4">
            <div className="font-semibold mb-2 text-sm" style={{ color: 'var(--text-2)' }}>זמינות שבועית:</div>
            <AvailabilityGrid
              selectedDays={intake.preferredDays}
              selectedTimes={intake.preferredTimeRanges as string[]}
              onChangeDays={(days) => updateIntake({ preferredDays: days })}
              onChangeTimes={(times) => updateIntake({ preferredTimeRanges: times as TimeSlot[] })}
            />
            {errors.days && <div style={{ color: 'var(--coral)', fontSize: 13, marginTop: 4 }}>{errors.days}</div>}
          </div>
        )}

        {/* ── Location type ───────────────────────────────────────── */}
        <div className="mb-4">
          <div className="font-semibold mb-2 text-sm" style={{ color: 'var(--text-2)' }}>סוג שיעור:</div>
          <div className="flex flex-col gap-2">
            {locationOptions.map((loc) => (
              <button
                key={loc.value}
                onClick={() => updateIntake({ locationPreference: loc.value })}
                className="text-right px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                style={{
                  background: intake.locationPreference === loc.value ? 'color-mix(in oklab, var(--cyan) 15%, var(--surface-2))' : 'var(--surface-2)',
                  border: `1px solid ${intake.locationPreference === loc.value ? 'var(--cyan)' : 'var(--line-2)'}`,
                  color: 'var(--text)',
                  cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                <span style={{ color: intake.locationPreference === loc.value ? 'var(--cyan)' : 'var(--text-3)', flexShrink: 0, transition: 'color 0.15s' }}>{loc.icon}</span>
                {loc.label}
              </button>
            ))}
          </div>
          {errors.location && <div style={{ color: 'var(--coral)', fontSize: 13, marginTop: 4 }}>{errors.location}</div>}
        </div>

        {(intake.locationPreference === 'frontal' || intake.locationPreference === 'both') && (
          <div className="mb-4">
            <div className="font-semibold mb-2 text-sm" style={{ color: 'var(--text-2)' }}>עיר:</div>
            <input
              type="text"
              placeholder="הכנס/י עיר..."
              value={intake.city}
              onChange={(e) => updateIntake({ city: e.target.value })}
              className="w-full p-3 rounded-xl wizard-input"
              style={{ background: 'var(--surface-2)', border: `1px solid ${errors.city ? 'var(--coral)' : 'var(--line-2)'}`, color: 'var(--text)', fontSize: 15, outline: 'none', transition: 'border-color 0.18s, box-shadow 0.18s' }}
            />
            {errors.city && <div style={{ color: 'var(--coral)', fontSize: 13, marginTop: 4 }}>{errors.city}</div>}
          </div>
        )}

        {isParent && (
          <div className="mb-4 p-3 rounded-lg flex items-start gap-2 text-sm" style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}>
            <Clock size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>נציג אך ורק מורים שפנויים באופן ודאי בחלונות הזמן שתגדירו.</span>
          </div>
        )}

        <div className="flex gap-3 mt-2">
          <button onClick={prevStep} className="py-3 px-5 rounded-xl font-medium" style={ctaBack}>חזור</button>
          <button onClick={() => void handleNext()} className="flex-1 py-3 rounded-xl wizard-cta-primary" style={ctaPrimary}>המשך</button>
        </div>
      </WizardShell>
    );
  }

  // ── STEP 9: Learning Style + Soft Preferences ────────────────────────────────
  if (step === 9) {
    const softPrefs = isParent ? SOFT_PREFS_PARENT : SOFT_PREFS_STUDENT;
    return (
      <WizardShell step={step}>
        <WizardProgress current={9} total={TOTAL_STEPS} />
        <WizardStepHeader
          title={isParent ? 'האם ישנם דגשים מיוחדים?' : 'בוא/י נדייק את הכימיה. מה חשוב לך במורה?'}
          subtitle={isParent ? 'סמנו קריטריונים שיעזרו לנו למצוא את המורה המתאים.' : 'אופציונלי'}
        />

        {!isParent && (
          <div className="mb-5">
            <div className="font-semibold mb-2 text-sm" style={{ color: 'var(--text-2)' }}>סגנון למידה:</div>
            <div className="flex flex-col gap-2">
              {LEARNING_STYLES.map((ls) => (
                <button
                  key={ls.value}
                  onClick={() => updateIntake({ learningStyle: toggleArray(intake.learningStyle, ls.value) })}
                  className="text-right px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: intake.learningStyle.includes(ls.value) ? 'color-mix(in oklab, var(--cyan) 15%, var(--surface-2))' : 'var(--surface-2)',
                    border: `1px solid ${intake.learningStyle.includes(ls.value) ? 'var(--cyan)' : 'var(--line-2)'}`,
                    color: 'var(--text)',
                    cursor: 'pointer',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                >
                  {ls.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="font-semibold mb-2 text-sm" style={{ color: 'var(--text-2)' }}>העדפות נוספות:</div>
          <div className="flex flex-col gap-2">
            {softPrefs.map((sp) => (
              <button
                key={sp.value}
                onClick={() => updateIntake({ softPreferences: toggleArray(intake.softPreferences, sp.value) })}
                className="text-right px-3 py-2 rounded-lg text-sm"
                style={{
                  background: intake.softPreferences.includes(sp.value) ? 'color-mix(in oklab, var(--cyan) 15%, var(--surface-2))' : 'var(--surface-2)',
                  border: `1px solid ${intake.softPreferences.includes(sp.value) ? 'var(--cyan)' : 'var(--line-2)'}`,
                  color: 'var(--text)',
                  cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                {sp.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <button onClick={prevStep} className="py-3 px-5 rounded-xl font-medium" style={ctaBack}>חזור</button>
          <button onClick={() => void handleNext()} className="flex-1 py-3 rounded-xl wizard-cta-primary" style={ctaPrimary}>המשך</button>
        </div>
      </WizardShell>
    );
  }

  // ── STEP 10: Review / Summary ─────────────────────────────────────────────────
  const levelLabels: Record<string, string> = { elementary: 'יסודי', middle: 'חטיבה', high: 'תיכון', academic: 'אקדמיה' };
  const goalLabels: Record<string, string> = { single_session: 'שיעור חד-פעמי', ongoing: 'מורה קבוע', exam_prep: 'מרתון לבחינה' };
  const locationLabels: Record<string, string> = { online: 'אונליין', frontal: 'פרונטלי', both: 'אונליין + פרונטלי' };

  if (isLoading) {
    return <MatchingLoadingScreen name={intake.fullName} />;
  }

  return (
    <WizardShell step={step}>
      <WizardProgress current={10} total={TOTAL_STEPS} />
      <WizardStepHeader
        title="נראה לך הכל בסדר?"
        subtitle="בדוק/י את הפרטים לפני שנמצא לך מורה"
        badge={<><Sparkles size={10} />  כמעט סיימנו</>}
      />

      <WizardSummaryCard
        items={[
          { label: 'שם', value: intake.fullName },
          ...(isParent && intake.childName ? [{ label: 'שם הילד/ה', value: intake.childName }] : []),
          { label: 'יעד', value: goalLabels[intake.learningGoal ?? ''] ?? '' },
          { label: 'רמה', value: `${levelLabels[intake.gradeLevel ?? '']} ${intake.subLevel}`.trim() },
          { label: 'מקצוע', value: intake.subjectName },
          { label: 'תקציב', value: intake.budgetMax === null ? 'לא צוין' : intake.budgetMax >= BUDGET_MAX ? `₪${intake.budgetMin}+` : `₪${intake.budgetMin} – ₪${intake.budgetMax}` },
          { label: 'ימים', value: intake.preferredDays.join(', ') || '—' },
          { label: 'שעות', value: intake.preferredTimeRanges.map((t) => ({ morning: 'בוקר', afternoon: 'צהריים', evening: 'ערב' } as Record<TimeSlot, string>)[t]).join(', ') || '—' },
          { label: 'מיקום', value: locationLabels[intake.locationPreference ?? ''] ?? '—' },
          ...(intake.city ? [{ label: 'עיר', value: intake.city }] : []),
        ]}
        onEdit={() => setStep(3)}
      />

      {errors.submit && (
        <div className="mt-3 p-3 rounded-lg text-sm" style={{ background: 'color-mix(in oklab, var(--coral) 15%, var(--surface-2))', color: 'var(--coral)' }}>
          {errors.submit}
        </div>
      )}

      <div className="flex gap-3 mt-4">
        <button onClick={prevStep} className="py-3 px-5 rounded-xl font-medium" style={ctaBack}>חזור</button>
        <button
          onClick={() => void handleNext()}
          className="flex-1 py-4 rounded-xl text-lg wizard-cta-primary"
          style={ctaPrimary}
        >
          מצאו לי מורים
        </button>
      </div>
    </WizardShell>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M44.5 20H24v8.5h11.8C34.7 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
      <path d="M6.3 14.7l7 5.1C15.2 16.4 19.3 14 24 14c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z" fill="#FF3D00"/>
      <path d="M24 46c5.8 0 10.8-1.9 14.7-5.2l-6.8-5.6C29.9 37 27.1 38 24 38c-5.8 0-10.7-3.9-12.4-9.3l-7 5.4C7.9 41.3 15.5 46 24 46z" fill="#4CAF50"/>
      <path d="M44.5 20H24v8.5h11.8c-.8 2.3-2.3 4.3-4.3 5.7l6.8 5.6C42.2 36.3 45 30.6 45 24c0-1.3-.2-2.7-.5-4z" fill="#1976D2"/>
    </svg>
  );
}

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div dir="rtl" lang="he" className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="mb-6" style={{ color: 'var(--cyan)' }}>
        <Loader2 size={48} className="animate-spin" />
      </div>
      <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)', textAlign: 'center' }}>מוצאים את ה-Top 3 שלך...</h2>
      <p className="text-center mb-8 max-w-xs" style={{ color: 'var(--text-2)', minHeight: 44 }}>{messages[msgIdx]}</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {['בודקים התאמת מקצוע', 'בודקים זמינות', 'בודקים טווח מחיר', 'מייצרים Top 3 מורים'].map((loadingStep, i) => (
          <div key={loadingStep} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--line-2)' }}>
            <span style={{ color: i <= msgIdx ? 'var(--lime)' : 'var(--text-3)', flexShrink: 0 }}>
              {i <= msgIdx ? <Check size={16} /> : <Circle size={16} />}
            </span>
            <span style={{ color: i <= msgIdx ? 'var(--text)' : 'var(--text-3)', fontSize: 14 }}>{loadingStep}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
