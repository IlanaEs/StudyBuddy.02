import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, GraduationCap, Briefcase, Award, BookOpen,
  Calendar, Clock, Users, Zap, Check, ChevronLeft, Shield,
  ShieldCheck, DollarSign, FileText, ToggleLeft, ToggleRight,
  Loader2, CheckCircle2, ArrowRight, BarChart2,
  CalendarCheck, CalendarX, RefreshCw, Link2Off,
  UserPlus, LogIn,
} from 'lucide-react';
import { TeacherAvailabilityCalendar, makeBlockKey, AVAIL_DAYS } from '../components/onboarding/TeacherAvailabilityCalendar';
import type { TimeBlockId } from '../components/onboarding/TeacherAvailabilityCalendar';
import type { GCalStatus, BusySlot } from '../api/teacherCalendar';
import {
  ensureCalendarLinkSession,
  initiateCalendarConnect,
  syncCalendar,
  fetchCalendarStatus,
  fetchBusySlots,
  disconnectCalendar as disconnectCalendarApi,
} from '../api/teacherCalendar';
import { ReauthRequiredError } from '../auth/ensureActiveSession';
import { consumeEarlyProviderToken } from '../auth/supabaseClient';

import { SelectableChip } from '../components/onboarding/SelectableChip';
import { SelectableCard } from '../components/onboarding/SelectableCard';
import { TeacherOnboardingProgress } from '../components/onboarding/TeacherOnboardingProgress';
import { TeacherPreviewCard } from '../components/onboarding/TeacherPreviewCard';
import { useAuth } from '../auth/AuthProvider';
import {
  fetchOnboardingDraft,
  saveOnboardingDraft,
  completeOnboarding,
  hydrateFromRemote,
} from '../api/teacherOnboarding';
import {
  createAcademicRepositoryRequest,
  fetchAcademicFields,
  fetchAcademicInstitutions,
  type AcademicRepositoryItem,
  type AcademicRepositoryType,
} from '../api/academicRepositories';
import {
  SB_ORANGE,
  SB_ORANGE_SOFT,
  SB_NEON,
  PROFESSIONAL_STATUS_OPTIONS,
  ACADEMIC_YEAR_OPTIONS,
  TEACHING_LEVELS,
  SUBJECTS_BY_LEVEL,
  TEACHING_STYLES,
  WEEKLY_AVAILABILITY_DAYS,
  MAX_STUDENTS_OPTIONS,
  WEEKLY_HOURS_OPTIONS,
  SLA_HOURS_OPTIONS,
  COMMITMENT_TYPES,
  MARATHON_SESSION_OPTIONS,
  EMERGENCY_AVAILABILITY_OPTIONS,
  INTRO_PRICING_OPTIONS,
  LOADING_MESSAGES,
  STEP_PROGRESS,
  ACADEMIC_PATH_STATUSES,
  type TeachingLevel,
  type ProfessionalStatus,
} from '../content/teacherOnboardingContent';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TeacherOnboardingData {
  fullName: string;
  professionalStatus: ProfessionalStatus | null;
  profileImagePreview: string | null;
  institution: string;
  degree: string;
  academicInstitutionId: string | null;
  academicInstitutionName: string;
  academicInstitutionCategory: string | null;
  academicInstitutionRequestId: string | null;
  academicInstitutionRequestName: string;
  academicFieldId: string | null;
  academicFieldName: string;
  academicFieldCategory: string | null;
  academicFieldRequestId: string | null;
  academicFieldRequestName: string;
  academicYear: string;
  excellentCourses: string;
  yearsOfExperience: string;
  expertiseAreas: string;
  teachingLevels: TeachingLevel[];
  selectedSubjects: string[];
  teachingStyles: string[];
  availabilityMode: 'calendar' | 'manual' | null;
  weeklyAvailability: string[];
  weeklyTimeBlocks: string[];
  maxActiveStudents: number | null;
  weeklyTeachingHours: number | null;
  autoStopMatching: boolean;
  bookingApproval: 'automatic' | 'manual' | null;
  slaHours: number | null;
  slaAutoAction: 'approve' | 'decline' | null;
  commitmentTypes: string[];
  marathonSessionCount: number | null;
  emergencyAvailability: string | null;
  hourlyRate: string;
  introSessionPricing: string | null;
  legalTax: boolean;
  legalContractor: boolean;
  legalMinors: boolean;
  legalCommunity: boolean;
}

const INITIAL_DATA: TeacherOnboardingData = {
  fullName: '',
  professionalStatus: null,
  profileImagePreview: null,
  institution: '',
  degree: '',
  academicInstitutionId: null,
  academicInstitutionName: '',
  academicInstitutionCategory: null,
  academicInstitutionRequestId: null,
  academicInstitutionRequestName: '',
  academicFieldId: null,
  academicFieldName: '',
  academicFieldCategory: null,
  academicFieldRequestId: null,
  academicFieldRequestName: '',
  academicYear: '',
  excellentCourses: '',
  yearsOfExperience: '',
  expertiseAreas: '',
  teachingLevels: [],
  selectedSubjects: [],
  teachingStyles: [],
  availabilityMode: null,
  weeklyAvailability: [],
  weeklyTimeBlocks: [],
  maxActiveStudents: null,
  weeklyTeachingHours: null,
  autoStopMatching: false,
  bookingApproval: null,
  slaHours: null,
  slaAutoAction: null,
  commitmentTypes: [],
  marathonSessionCount: null,
  emergencyAvailability: null,
  hourlyRate: '',
  introSessionPricing: null,
  legalTax: false,
  legalContractor: false,
  legalMinors: false,
  legalCommunity: false,
};

function toggleItem(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

function isAcademicPath(status: ProfessionalStatus | null): boolean {
  return status !== null && ACADEMIC_PATH_STATUSES.includes(status);
}

type StepValidationErrors = Record<string, string>;

type StepValidationResult = {
  isValid: boolean;
  errors: StepValidationErrors;
};

function validateTeacherOnboardingStep(step: number, formState: TeacherOnboardingData): StepValidationResult {
  const errors: StepValidationErrors = {};
  const rate = Number(formState.hourlyRate);

  if (step === 1) {
    if (formState.fullName.trim().length < 2) errors.fullName = 'יש להזין שם מלא.';
    if (!formState.professionalStatus) errors.professionalStatus = 'יש לבחור מעמד מקצועי.';
  }

  if (step === 2) {
    if (isAcademicPath(formState.professionalStatus)) {
      if (!formState.academicInstitutionId && !formState.academicInstitutionRequestId) errors.institution = 'יש לבחור מוסד לימודים מתוך הרשימה או לשלוח בקשת הוספה.';
      if (!formState.academicFieldId && !formState.academicFieldRequestId) errors.degree = 'יש לבחור תחום לימוד מתוך הרשימה או לשלוח בקשת הוספה.';
      if (!formState.academicYear) errors.academicYear = 'יש לבחור שנת לימוד.';
    } else {
      if (!formState.yearsOfExperience.trim()) errors.yearsOfExperience = 'יש להזין שנות ניסיון.';
      if (!formState.expertiseAreas.trim()) errors.expertiseAreas = 'יש להזין תחומי מומחיות.';
    }
  }

  if (step === 3) {
    if (formState.teachingLevels.length === 0) errors.teachingLevels = 'יש לבחור לפחות רמת הוראה אחת.';
    if (formState.selectedSubjects.length === 0) errors.selectedSubjects = 'יש לבחור לפחות מקצוע אחד.';
  }

  if (step === 4) {
    if (formState.weeklyTimeBlocks.length === 0) errors.weeklyTimeBlocks = 'יש לבחור לפחות חלון זמינות אחד.';
    if (formState.maxActiveStudents === null) errors.maxActiveStudents = 'יש לבחור מספר תלמידים פעילים.';
    if (formState.weeklyTeachingHours === null) errors.weeklyTeachingHours = 'יש לבחור מספר שעות שבועיות.';
    if (!formState.bookingApproval) errors.bookingApproval = 'יש לבחור אופן אישור הזמנות.';
    if (formState.bookingApproval === 'manual' && formState.slaHours === null) errors.slaHours = 'יש לבחור זמן תגובה מקסימלי.';
    if (formState.bookingApproval === 'manual' && !formState.slaAutoAction) errors.slaAutoAction = 'יש לבחור פעולה אוטומטית לאחר SLA.';
    if (formState.commitmentTypes.length === 0) errors.commitmentTypes = 'יש לבחור לפחות סוג מחויבות אחד.';
    if (formState.commitmentTypes.includes('exam_marathons') && formState.marathonSessionCount === null) {
      errors.marathonSessionCount = 'יש לבחור מספר שיעורים למרתון.';
    }
    if (!formState.emergencyAvailability) errors.emergencyAvailability = 'יש לבחור זמינות לשיעורי חירום.';
  }

  if (step === 5) {
    if (!Number.isFinite(rate) || rate <= 0) errors.hourlyRate = 'יש להזין מחיר שעתי גבוה מ־0.';
    if (!formState.introSessionPricing) errors.introSessionPricing = 'יש לבחור תמחור לשיעור מבוא.';
    if (!formState.legalTax || !formState.legalContractor || !formState.legalMinors || !formState.legalCommunity) {
      errors.legal = 'יש לאשר את כל ארבע ההצהרות להמשך.';
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

function validateTeacherOnboardingAll(formState: TeacherOnboardingData): { isValid: boolean; errorsByStep: Record<number, StepValidationErrors>; firstInvalidStep: number | null } {
  const errorsByStep: Record<number, StepValidationErrors> = {};
  let firstInvalidStep: number | null = null;

  for (const step of [1, 2, 3, 4, 5]) {
    const result = validateTeacherOnboardingStep(step, formState);
    if (!result.isValid) {
      errorsByStep[step] = result.errors;
      firstInvalidStep ??= step;
    }
  }

  return { isValid: firstInvalidStep === null, errorsByStep, firstInvalidStep };
}

function mapBackendOnboardingError(error: string, formState: TeacherOnboardingData) {
  const fullValidation = validateTeacherOnboardingAll(formState);
  if (!fullValidation.isValid && fullValidation.firstInvalidStep !== null) {
    return {
      message: 'חסרים פרטים בטופס. תקנו את השלב המסומן ונסו שוב.',
      step: fullValidation.firstInvalidStep,
      errors: fullValidation.errorsByStep[fullValidation.firstInvalidStep] ?? {},
    };
  }

  const lower = error.toLowerCase();
  if (lower.includes('hourly') || lower.includes('rate') || lower.includes('number')) {
    return { message: 'יש להזין מחיר שעתי גבוה מ־0.', step: 5, errors: { hourlyRate: 'יש להזין מחיר שעתי גבוה מ־0.' } };
  }
  if (lower.includes('full') || lower.includes('name')) {
    return { message: 'יש להזין שם מלא.', step: 1, errors: { fullName: 'יש להזין שם מלא.' } };
  }
  if (lower.includes('forbidden')) {
    return { message: 'אין הרשאה להשלים את התהליך. אנא התחברו מחדש.', step: 1, errors: {} };
  }

  return { message: 'לא ניתן להשלים את הפעלת הפרופיל כרגע. בדקו את הפרטים ונסו שוב.', step: 6, errors: {} };
}

function translateAuthGateError(error: string): string {
  const lower = error.toLowerCase();
  if (lower.includes('invalid') && lower.includes('email')) return 'יש להזין כתובת אימייל תקינה.';
  if (lower.includes('password')) return 'הסיסמה חייבת להכיל לפחות 8 תווים.';
  if (lower.includes('invalid login') || lower.includes('credentials')) return 'האימייל או הסיסמה אינם נכונים.';
  if (lower.includes('already') || lower.includes('registered')) return 'כבר קיים חשבון עם כתובת האימייל הזו.';
  return 'לא ניתן להתחבר כרגע. בדקו את הפרטים ונסו שוב.';
}

// Maps Google Calendar busy slots (UTC ISO timestamps) to onboarding grid block keys
// like "ראשון-morning" using Asia/Jerusalem local time.
//
// Walking hour-by-hour (same approach as availabilityMapper.ts in the student flow)
// correctly handles:
//   - all-day events (Google returns midnight-to-midnight UTC)
//   - multi-day events
//   - events that span two time-block periods
//   - DST transitions in Israel (UTC+2 winter / UTC+3 summer)
//
// Block hour boundaries (Jerusalem local time, consistent with TeacherAvailabilityCalendar):
//   morning   08:00–13:00
//   afternoon 13:00–18:00
//   evening   18:00–22:00
const ISRAEL_TZ = 'Asia/Jerusalem';
const MS_PER_HOUR = 60 * 60 * 1000;

const _mapDowFormatter = new Intl.DateTimeFormat('en-US', { timeZone: ISRAEL_TZ, weekday: 'long' });
const _mapHourFormatter = new Intl.DateTimeFormat('en-US', { timeZone: ISRAEL_TZ, hour: 'numeric', hour12: false });

const _DOW_MAP: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
};

const _HEBREW_DAYS: Record<number, typeof AVAIL_DAYS[number]> = {
  0: 'ראשון', 1: 'שני', 2: 'שלישי', 3: 'רביעי', 4: 'חמישי', 5: 'שישי', 6: 'שבת',
};

const _TIME_BLOCKS: Array<{ id: TimeBlockId; startH: number; endH: number }> = [
  { id: 'morning',   startH: 8,  endH: 13 },
  { id: 'afternoon', startH: 13, endH: 18 },
  { id: 'evening',   startH: 18, endH: 22 },
];

function _getLocalDow(date: Date): number {
  const weekday = _mapDowFormatter.formatToParts(date).find((p) => p.type === 'weekday')?.value ?? 'Sunday';
  return _DOW_MAP[weekday] ?? 0;
}

function _getLocalHour(date: Date): number {
  const h = parseInt(_mapHourFormatter.formatToParts(date).find((p) => p.type === 'hour')?.value ?? '0', 10);
  return h === 24 ? 0 : h;
}

function mapBusySlotsToBlockKeys(busySlots: BusySlot[]): string[] {
  const blockKeys = new Set<string>();
  for (const slot of busySlots) {
    const startMs = new Date(slot.startAt).getTime();
    const endMs   = new Date(slot.endAt).getTime();
    // Walk hour-by-hour through the busy period; each hour maps to at most one block.
    for (let t = startMs; t < endMs; t += MS_PER_HOUR) {
      const date     = new Date(t);
      const dow      = _getLocalDow(date);
      const hebrewDay = _HEBREW_DAYS[dow];
      if (!hebrewDay) continue;
      const hour = _getLocalHour(date);
      const block = _TIME_BLOCKS.find((b) => hour >= b.startH && hour < b.endH);
      if (block) blockKeys.add(`${hebrewDay}-${block.id}`);
    }
  }
  return [...blockKeys];
}

// ── Shell ──────────────────────────────────────────────────────────────────────

function SaveIndicator({ status }: { status: DraftStatus }) {
  if (status === 'idle') return null;
  const color =
    status === 'saving' ? 'var(--text-3)' : status === 'saved' ? '#22c55e' : '#ef4444';
  return (
    <div
      style={{
        position: 'fixed',
        top: 14,
        left: 14,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        color,
        background: 'var(--surface)',
        border: `1px solid ${color}`,
        borderRadius: 999,
        padding: '3px 10px',
        letterSpacing: '0.03em',
        opacity: 0.9,
      }}
    >
      {status === 'saved' && <Check size={11} strokeWidth={3} />}
      {status === 'saving' ? 'שומר…' : status === 'saved' ? 'נשמר' : 'שגיאת שמירה'}
    </div>
  );
}

function OnboardingShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div
      dir="rtl"
      lang="he"
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        padding: '24px 16px 56px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        className="ob-step-enter"
        style={{
          width: '100%',
          maxWidth: wide ? 880 : 640,
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          border: `2px solid rgba(0,246,255,0.18)`,
          overflow: 'clip',
          boxShadow: `5px 5px 0 rgba(0,0,0,0.4), 0 24px 60px -32px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,246,255,0.06) inset`,
        }}
      >
        {/* Neon top stripe — Cyber-Professional design spec */}
        <div
          style={{
            height: 4,
            background: `linear-gradient(90deg, ${SB_NEON} 0%, color-mix(in oklab, ${SB_NEON} 55%, ${SB_ORANGE}) 60%, rgba(249,115,22,0.3) 100%)`,
            boxShadow: `0 0 10px ${SB_NEON}66`,
          }}
        />
        <div className="ob-step-body">{children}</div>
      </div>
    </div>
  );
}

// ── Step header ────────────────────────────────────────────────────────────────

function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <h2
        style={{
          margin: 0,
          fontSize: 21,
          fontWeight: 800,
          color: 'var(--text)',
          fontFamily: 'var(--font-display)',
          lineHeight: 1.2,
          letterSpacing: '-0.025em',
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          style={{
            margin: '7px 0 0',
            fontSize: 14,
            color: 'var(--text-2)',
            fontWeight: 500,
            lineHeight: 1.55,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ── Section label ──────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--text-3)',
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        marginBottom: 10,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 14,
          height: 2,
          borderRadius: 99,
          background: SB_ORANGE,
          opacity: 0.7,
          flexShrink: 0,
        }}
      />
      {children}
    </div>
  );
}

// ── Ops section card ───────────────────────────────────────────────────────────

function OpsSection({ title, icon, children, color = SB_ORANGE }: { title: string; icon: ReactNode; children: ReactNode; color?: string }) {
  return (
    <div
      className="ob-ops-section"
      style={{
        border: `2px solid color-mix(in oklab, ${color} 22%, transparent)`,
        borderRadius: 'var(--radius)',
        padding: '18px 20px',
        background:
          'linear-gradient(160deg, rgba(255,255,255,0.025), transparent), var(--surface-2)',
        boxShadow: '3px 3px 0 rgba(0,0,0,0.22)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
          paddingBottom: 12,
          borderBottom: `1px solid color-mix(in oklab, ${color} 15%, var(--line))`,
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 8,
            background: `color-mix(in oklab, ${color} 18%, transparent)`,
            color: color,
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: 'var(--text)',
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

// ── Number chip row ────────────────────────────────────────────────────────────

function NumberChipRow({
  options,
  selected,
  onSelect,
  suffix = '',
}: {
  options: number[];
  selected: number | null;
  onSelect: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onSelect(n)}
          className="ob-num-chip"
          style={{
            padding: '6px 14px',
            borderRadius: 999,
            border: `2px solid ${selected === n ? SB_ORANGE : 'var(--line-2)'}`,
            background: selected === n ? SB_ORANGE_SOFT : 'transparent',
            color: selected === n ? SB_ORANGE : 'var(--text-2)',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
          }}
        >
          {n}{suffix}
        </button>
      ))}
    </div>
  );
}

// ── Toggle ─────────────────────────────────────────────────────────────────────

function OpsToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="ob-toggle"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '8px 0',
        color: 'var(--text)',
      }}
    >
      <span style={{ color: checked ? SB_ORANGE : 'var(--text-3)', flexShrink: 0, transition: 'color 0.15s ease' }}>
        {checked ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: checked ? 'var(--text)' : 'var(--text-2)' }}>
        {label}
      </span>
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      style={{
        marginTop: 8,
        color: 'var(--coral)',
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1.45,
      }}
    >
      {message}
    </div>
  );
}

function AcademicRepositoryAutocomplete({
  label,
  placeholder,
  items,
  selectedName,
  selectedCategory,
  pendingName,
  onSelect,
  onRequestAdd,
  error,
  requestError,
  requestDisabled,
}: {
  label: string;
  placeholder: string;
  items: AcademicRepositoryItem[];
  selectedName: string;
  selectedCategory: string | null;
  pendingName: string;
  onSelect: (item: AcademicRepositoryItem) => void;
  onRequestAdd: (name: string) => Promise<void>;
  error?: string;
  requestError?: string | null;
  requestDisabled?: boolean;
}) {
  const [query, setQuery] = useState(selectedName || pendingName);
  const [open, setOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    setQuery(selectedName || pendingName);
  }, [pendingName, selectedName]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return items.slice(0, 10);
    return items
      .filter((item) => {
        const text = `${item.name} ${item.category ?? ''}`.toLocaleLowerCase();
        return text.includes(normalized);
      })
      .slice(0, 10);
  }, [items, query]);

  const exactMatch = items.some((item) => item.name.trim().toLocaleLowerCase() === query.trim().toLocaleLowerCase());
  const canRequest = query.trim().length >= 2 && !exactMatch;

  async function requestAdd() {
    if (!canRequest || requesting || requestDisabled) return;
    setRequesting(true);
    try {
      await onRequestAdd(query.trim());
      setOpen(false);
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <SectionLabel>{label}</SectionLabel>
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="ob-input"
        style={inputStyle}
        autoComplete="off"
      />
      {selectedName && (
        <div style={{ marginTop: 8, fontSize: 12, color: SB_ORANGE, fontWeight: 800 }}>
          נבחר: {selectedName}{selectedCategory ? ` · ${selectedCategory}` : ''}
        </div>
      )}
      {pendingName && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--gold)', fontWeight: 800 }}>
          {pendingName} · ממתין לאישור אדמין
        </div>
      )}
      {(open || error || requestError) && (
        <div
          style={{
            marginTop: 8,
            border: '1px solid var(--line-2)',
            borderRadius: 'var(--radius-sm)',
            background: 'color-mix(in oklab, var(--surface) 92%, black 8%)',
            boxShadow: '0 22px 54px -34px rgba(0,0,0,0.85)',
            overflow: 'hidden',
          }}
        >
          {open && filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(item);
                setQuery(item.name);
                setOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                padding: '11px 13px',
                border: 'none',
                borderBottom: '1px solid var(--line)',
                background: item.name === selectedName ? SB_ORANGE_SOFT : 'transparent',
                color: 'var(--text)',
                cursor: 'pointer',
                textAlign: 'right',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
              }}
            >
              <span>{item.name}</span>
              {item.category && <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{item.category}</span>}
            </button>
          ))}
          {open && filtered.length === 0 && (
            <div style={{ padding: '11px 13px', color: 'var(--text-3)', fontSize: 13 }}>
              לא נמצאו תוצאות
            </div>
          )}
          {open && canRequest && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void requestAdd()}
              disabled={requesting || requestDisabled}
              style={{
                width: '100%',
                padding: '12px 13px',
                border: 'none',
                background: 'rgba(249,115,22,0.1)',
                color: requestDisabled ? 'var(--text-3)' : SB_ORANGE,
                cursor: requestDisabled ? 'not-allowed' : 'pointer',
                textAlign: 'right',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              {requesting ? 'שולח בקשה...' : 'לא ברשימה? בקשת הוספה לאישור אדמין'}
            </button>
          )}
          <FieldError message={error || requestError || undefined} />
        </div>
      )}
    </div>
  );
}

// ── Nav buttons ────────────────────────────────────────────────────────────────

function NavButtons({
  onBack,
  onNext,
  nextLabel = 'המשך',
  nextDisabled = false,
  hideBack = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  hideBack?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        marginTop: 32,
        position: 'sticky',
        bottom: 0,
        zIndex: 10,
        background: 'var(--surface)',
        padding: '16px 0 28px',
      }}
    >
      {!hideBack && onBack && (
        <button
          type="button"
          onClick={onBack}
          className="ob-btn-back"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '12px 18px',
            borderRadius: 'var(--radius)',
            border: '2px solid var(--line-2)',
            background: 'transparent',
            color: 'var(--text-2)',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <ChevronLeft size={15} />
          חזור
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className={nextDisabled ? '' : 'ob-btn-next'}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '14px 20px',
          borderRadius: 'var(--radius)',
          border: `2px solid ${nextDisabled ? 'var(--line)' : SB_ORANGE}`,
          background: nextDisabled ? 'transparent' : SB_ORANGE,
          color: nextDisabled ? 'var(--text-3)' : '#fff',
          fontSize: 15,
          fontWeight: 800,
          cursor: nextDisabled ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-display)',
          letterSpacing: '-0.01em',
          boxShadow: nextDisabled ? 'none' : `4px 4px 0 rgba(249,115,22,0.3)`,
        }}
      >
        {nextLabel}
        {!nextDisabled && <ArrowRight size={15} />}
      </button>
    </div>
  );
}

// ── Divider ────────────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: 1, background: 'var(--line)', margin: '20px 0' }} />;
}

// ── Google Calendar Card ───────────────────────────────────────────────────────

function GoogleCalendarCard({
  status,
  lastSynced,
  busyCount,
  onConnect,
  onDisconnect,
  onManual,
  onSync,
  errorHint,
}: {
  status: GCalStatus;
  lastSynced?: string | null;
  busyCount?: number;
  onConnect: () => void;
  onDisconnect: () => void;
  /** Called when the user explicitly skips GCal and wants to set availability manually. */
  onManual: () => void;
  /** Called when the user presses "Sync Now" from the connected state. */
  onSync: () => void;
  /** Provides a machine-readable reason so the sync_failed state can show
   *  an appropriate recovery hint rather than a one-size-fits-all message. */
  errorHint?: 'session_expired' | 'generic';
}) {
  const borderByStatus: Record<GCalStatus, string> = {
    not_connected: 'var(--line-2)',
    connecting: 'color-mix(in oklab, var(--gold) 35%, transparent)',
    connected: 'color-mix(in oklab, var(--lime) 35%, transparent)',
    syncing: 'color-mix(in oklab, var(--blue) 35%, transparent)',
    sync_failed: 'color-mix(in oklab, var(--coral) 35%, transparent)',
    manual_mode: 'color-mix(in oklab, var(--text-3) 25%, transparent)',
  };

  return (
    <div
      style={{
        border: `1.5px solid ${borderByStatus[status]}`,
        borderRadius: 'var(--radius-sm)',
        padding: '14px 16px',
        background: 'rgba(255,255,255,0.03)',
        transition: 'border-color 0.2s ease',
      }}
    >
      {status === 'not_connected' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#4285F4',
              color: '#fff',
              fontWeight: 900,
              fontSize: 16,
              flexShrink: 0,
              fontFamily: 'var(--font-display)',
            }}
          >
            G
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Google Calendar</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              חבר את היומן לחסימה אוטומטית של שעות עסוקות
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={onManual}
              style={{
                padding: '7px 12px',
                borderRadius: 999,
                border: '1px solid var(--line-2)',
                background: 'transparent',
                color: 'var(--text-3)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              המשך ידנית
            </button>
            <button
              type="button"
              onClick={onConnect}
              style={{
                padding: '7px 14px',
                borderRadius: 999,
                border: `1.5px solid ${SB_ORANGE}`,
                background: SB_ORANGE,
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              חבר Google Calendar
            </button>
          </div>
        </div>
      )}

      {status === 'connecting' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gold)' }}>
          <Loader2 size={16} className="ob-spin" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
            מתחבר ל-Google Calendar...
          </span>
        </div>
      )}

      {status === 'syncing' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Loader2 size={16} className="ob-spin" style={{ color: 'var(--blue)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
            מסנכרן אירועים מ-Google Calendar...
          </span>
        </div>
      )}

      {status === 'connected' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CalendarCheck size={20} style={{ color: 'var(--lime)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              Google Calendar מחובר
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
              {lastSynced
                ? `סונכרן ${new Date(lastSynced).toLocaleDateString('he-IL')} · ${busyCount ?? 0} שעות חסומות`
                : 'מחובר'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              type="button"
              onClick={onSync}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '5px 10px',
                borderRadius: 999,
                border: `1px solid ${SB_NEON}`,
                background: 'transparent',
                color: SB_NEON,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <RefreshCw size={10} />
              סנכרן עכשיו
            </button>
            <button
              type="button"
              onClick={onDisconnect}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '5px 10px',
                borderRadius: 999,
                border: '1px solid var(--line-2)',
                background: 'transparent',
                color: 'var(--text-3)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Link2Off size={10} />
              נתק
            </button>
            <button
              type="button"
              onClick={onConnect}
              style={{
                padding: '5px 10px',
                borderRadius: 999,
                border: '1px solid var(--line-2)',
                background: 'transparent',
                color: 'var(--text-2)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              החלף חשבון
            </button>
          </div>
        </div>
      )}

      {status === 'sync_failed' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CalendarX size={20} style={{ color: 'var(--coral)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>לא ניתן להתחבר</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              {errorHint === 'session_expired'
                ? 'פג תוקף הסשן — אנא התחבר מחדש כדי לחבר Google Calendar'
                : 'הרשאה נדחתה או פג תוקף — נסה שוב'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button
              type="button"
              onClick={onManual}
              style={{
                padding: '7px 10px',
                borderRadius: 999,
                border: '1px solid var(--line-2)',
                background: 'transparent',
                color: 'var(--text-3)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              המשך ידנית
            </button>
            {errorHint !== 'session_expired' && (
              <button
                type="button"
                onClick={onConnect}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '7px 12px',
                  borderRadius: 999,
                  border: '1px solid var(--line-2)',
                  background: 'transparent',
                  color: 'var(--text-2)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={11} />
                נסה שוב
              </button>
            )}
          </div>
        </div>
      )}

      {status === 'manual_mode' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CalendarCheck size={20} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>זמינות ידנית</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              הגדרת זמינות ידנית — ניתן לחבר Google Calendar בכל עת
            </div>
          </div>
          <button
            type="button"
            onClick={onConnect}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '7px 12px',
              borderRadius: 999,
              border: `1px solid ${SB_ORANGE}`,
              background: 'transparent',
              color: SB_ORANGE,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            חבר Google Calendar
          </button>
        </div>
      )}
    </div>
  );
}

// ── Input style ────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 'var(--radius-sm)',
  border: '2px solid var(--line-2)',
  background: 'var(--surface-2)',
  color: 'var(--text)',
  fontSize: 14,
  fontWeight: 500,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'var(--font-body)',
};

// ── Main page ──────────────────────────────────────────────────────────────────

// Draft save status — shown briefly to the user but never blocks navigation
type DraftStatus = 'idle' | 'saving' | 'saved' | 'save-error';

export function TeacherOnboardingPage() {
  const navigate = useNavigate();
  const { status, session, login, signup, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<TeacherOnboardingData>(INITIAL_DATA);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle');
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [nextRoute, setNextRoute] = useState('/teacher/dashboard');
  // Initial draft fetch state — shown while the first GET /api/teachers/me/onboarding
  // is in-flight. After the fetch resolves (success or null draft) this becomes false.
  const [draftLoading, setDraftLoading] = useState(true);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState<Record<number, StepValidationErrors>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Snapshot of data+token captured when entering step 7 (loading screen)
  const completionSnapshotRef = useRef<{ data: TeacherOnboardingData; token: string } | null>(null);
  // Prevents loading the draft more than once even if session token rotates
  const hasFetchedDraftRef = useRef(false);
  // Tracks whether the user has made any edits before the draft finishes loading
  const hasUserEditedRef = useRef(false);
  // Monotonically incrementing counter — stale save responses are discarded
  const saveVersionRef = useRef(0);
  // Prevents double-submission when activateProfile is clicked quickly
  const isActivatingRef = useRef(false);

  // ── Auth gate (shown between step 3 and step 4 for guests) ─────────────────
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [authGateTab, setAuthGateTab] = useState<'signup' | 'login'>('signup');
  const [authGateFullName, setAuthGateFullName] = useState('');
  const [authGateEmail, setAuthGateEmail] = useState('');
  const [authGatePassword, setAuthGatePassword] = useState('');
  const [authGateError, setAuthGateError] = useState<string | null>(null);
  const [authGateLoading, setAuthGateLoading] = useState(false);
  // Records which auth action ('signup'|'login') is pending post-auth sync.
  // Set before calling login()/signup(), consumed by the post-auth useEffect.
  const pendingPostAuthType = useRef<'signup' | 'login' | null>(null);
  // Debounce timer for guest localStorage writes
  const guestSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [gcalStatus, setGcalStatus] = useState<GCalStatus>('not_connected');
  // Tracks why the last connect attempt failed so the card can show a
  // targeted recovery hint (e.g. "re-login" vs generic "try again").
  const [gcalConnectError, setGcalConnectError] = useState<'session_expired' | 'generic' | null>(null);
  const [busyBlocks, setBusyBlocks] = useState<string[]>([]);
  const [gcalLastSynced, setGcalLastSynced] = useState<string | null>(null);
  const [gcalBusyCount, setGcalBusyCount] = useState(0);
  const [removedBlocksNotice, setRemovedBlocksNotice] = useState(false);
  const [academicInstitutions, setAcademicInstitutions] = useState<AcademicRepositoryItem[]>([]);
  const [academicFields, setAcademicFields] = useState<AcademicRepositoryItem[]>([]);
  const [repositoryRequestErrors, setRepositoryRequestErrors] = useState<Partial<Record<AcademicRepositoryType, string>>>({});

  function update(patch: Partial<TeacherOnboardingData>) {
    hasUserEditedRef.current = true;
    setData((prev) => ({ ...prev, ...patch }));
  }

  useEffect(() => {
    fetchAcademicInstitutions()
      .then((response) => {
        if (!('error' in response)) setAcademicInstitutions(response.data.institutions);
      })
      .catch(() => {});
    fetchAcademicFields()
      .then((response) => {
        if (!('error' in response)) setAcademicFields(response.data.fields);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setStepErrors((prev) => {
      const currentErrors = prev[step];
      if (!currentErrors || Object.keys(currentErrors).length === 0) return prev;

      const stillInvalid = validateTeacherOnboardingStep(step, data).errors;
      const nextCurrentErrors = Object.fromEntries(
        Object.entries(currentErrors).filter(([field]) => stillInvalid[field]),
      );

      if (Object.keys(nextCurrentErrors).length === Object.keys(currentErrors).length) return prev;

      return {
        ...prev,
        [step]: nextCurrentErrors,
      };
    });
  }, [data, step]);

  // ── Guest mode: load draft from localStorage when unauthenticated ──────────
  // When the user is not logged in, we skip the backend fetch and restore any
  // previous guest draft from localStorage instead. This also unblocks
  // `draftLoading` so the spinner doesn't hang forever without a session.
  useEffect(() => {
    if (status !== 'unauthenticated') return;
    if (hasFetchedDraftRef.current) return;
    hasFetchedDraftRef.current = true;

    try {
      const raw = localStorage.getItem('sb_teacher_guest_draft');
      if (raw && !hasUserEditedRef.current) {
        const saved = JSON.parse(raw) as { data?: Partial<TeacherOnboardingData>; step?: number };
        if (saved.data) setData((prev) => ({ ...prev, ...saved.data! }));
        const savedStep = typeof saved.step === 'number' ? saved.step : 1;
        if (savedStep >= 1 && savedStep <= 3) setStep(savedStep);
      }
    } catch { /* ignore malformed localStorage */ }

    setDraftLoading(false);
  }, [status]);

  // ── Guest mode: auto-save draft to localStorage while in steps 1–3 ─────────
  // Debounced (350 ms) so rapid keystrokes don't spam writes.
  useEffect(() => {
    if (status !== 'unauthenticated' || step > 3) return;
    if (guestSaveTimerRef.current) clearTimeout(guestSaveTimerRef.current);
    guestSaveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem('sb_teacher_guest_draft', JSON.stringify({ data, step }));
      } catch { /* quota exceeded or private browsing */ }
    }, 350);
    return () => {
      if (guestSaveTimerRef.current) clearTimeout(guestSaveTimerRef.current);
    };
  }, [data, step, status]);

  // ── Post-auth sync: fires after the auth gate completes ────────────────────
  // pendingPostAuthType.current is set just before login()/signup() resolves.
  // Once status becomes 'authenticated' and the session token is available,
  // this effect either pushes the guest draft to the backend (new account) or
  // pulls the existing backend draft (returning account), then advances to step 4.
  useEffect(() => {
    if (pendingPostAuthType.current === null) return;
    if (status !== 'authenticated') return;
    const token = session?.access_token;
    if (!token) return;

    const type = pendingPostAuthType.current;
    pendingPostAuthType.current = null; // consume

    if (type === 'signup') {
      // New account: push the current wizard state to the backend as the initial draft.
      saveOnboardingDraft(data, step, token).catch(() => {}).finally(() => {
        try { localStorage.removeItem('sb_teacher_guest_draft'); } catch {}
      });
      setShowAuthGate(false);
      setStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      silentSave(data, 4);
    } else {
      // Existing account: pull their saved draft from the backend and restore it.
      fetchOnboardingDraft(token)
        .then((response) => {
          try { localStorage.removeItem('sb_teacher_guest_draft'); } catch {}
          if (!('error' in response) && response.data.onboarding) {
            const hydrated = hydrateFromRemote(response.data.onboarding, INITIAL_DATA);
            setData((prev) => ({ ...prev, ...hydrated }));
            const savedStep = response.data.onboarding.onboardingStep ?? 1;
            setStep(savedStep > 3 && savedStep <= 6 ? savedStep : 4);
          } else {
            // No existing backend draft — push local state as their starting point.
            saveOnboardingDraft(data, step, token).catch(() => {});
            setStep(4);
          }
          setShowAuthGate(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        })
        .catch(() => {
          setShowAuthGate(false);
          setStep(4);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.access_token]);

  // Load existing draft once per page load. Depends on session token so it
  // fires after AuthProvider resolves even if that happens post-mount.
  useEffect(() => {
    const token = session?.access_token;
    if (!token || hasFetchedDraftRef.current) return;
    hasFetchedDraftRef.current = true;

    setDraftLoading(true);
    setDraftError(null);

    fetchOnboardingDraft(token)
      .then((response) => {
        if ('error' in response) {
          // Network or auth error — allow retry when token rotates.
          // This is the only case that resets the flag; a null draft is a
          // legitimate "no record yet" response and must NOT loop forever.
          hasFetchedDraftRef.current = false;
          setDraftError('לא ניתן לטעון את הטיוטה. אנא רענן את הדף.');
          setDraftLoading(false);
          return;
        }

        // Consume the OAuth return context keys regardless of whether a draft
        // exists. This prevents them from being re-read on later re-renders.
        const returnStepRaw = sessionStorage.getItem('sb_gcal_return_step');
        const returnStep = returnStepRaw ? parseInt(returnStepRaw, 10) : 1;
        if (returnStepRaw) sessionStorage.removeItem('sb_gcal_return_step');
        sessionStorage.removeItem('sb_gcal_return_route');

        if (!response.data.onboarding) {
          // No draft saved yet — still honour the OAuth return step so the
          // user lands back on the calendar screen after approving GCal.
          if (returnStep > 1 && returnStep <= 6) setStep(returnStep);
          setDraftLoading(false);
          return;
        }

        // Don't overwrite changes the user made while the fetch was in-flight
        if (!hasUserEditedRef.current) {
          const hydrated = hydrateFromRemote(response.data.onboarding, INITIAL_DATA);
          setData((prev) => ({ ...prev, ...hydrated }));
          const savedStep = response.data.onboarding.onboardingStep;
          const targetStep = Math.max(savedStep, returnStep);
          if (targetStep > 1 && targetStep <= 6) setStep(targetStep);
        }
        setDraftLoading(false);
      })
      .catch(() => {
        // Network-level failure — allow retry when token rotates
        hasFetchedDraftRef.current = false;
        setDraftError('לא ניתן לטעון את הטיוטה. אנא רענן את הדף.');
        setDraftLoading(false);
      });
  }, [session?.access_token]);

  // Silent background save — fires on each step advance, never blocks the user.
  // Uses a version counter so only the most recent response updates the status.
  const silentSave = useCallback(
    (currentData: TeacherOnboardingData, currentStep: number) => {
      const token = session?.access_token;
      if (!token) return;

      const version = ++saveVersionRef.current;
      setDraftStatus('saving');
      saveOnboardingDraft(currentData, currentStep, token)
        .then((response) => {
          if (version !== saveVersionRef.current) return;
          setDraftStatus('error' in response ? 'save-error' : 'saved');
          setTimeout(() => setDraftStatus((s) => (s !== 'saving' ? 'idle' : s)), 2000);
        })
        .catch(() => {
          if (version !== saveVersionRef.current) return;
          setDraftStatus('save-error');
          setTimeout(() => setDraftStatus((s) => (s !== 'saving' ? 'idle' : s)), 2000);
        });
    },
    [session],
  );

  useEffect(() => {
    if (step !== 4) return;
    const accessToken = session?.access_token;
    if (!accessToken) return;

    // session.provider_token is often missing because the SIGNED_IN event that
    // carries it fires during Supabase client init — before AuthProvider subscribes.
    // consumeEarlyProviderToken() returns the token captured at client-creation time.
    const sessionProviderToken = session?.provider_token;
    const earlyToken = sessionProviderToken ? null : consumeEarlyProviderToken();
    const providerToken = sessionProviderToken ?? earlyToken ?? undefined;
    const wasConnecting = sessionStorage.getItem('sb_gcal_connecting') === '1';

    if (wasConnecting) sessionStorage.removeItem('sb_gcal_connecting');

    if (providerToken) {
      // Returned from OAuth with a live Google token — sync immediately.
      // Cache the token in sessionStorage so "Sync Now" can re-use it within
      // this session without triggering a full OAuth round-trip again.
      try { sessionStorage.setItem('sb_gcal_provider_token', providerToken); } catch { /* quota */ }
      setGcalStatus('connecting');
      syncCalendar(accessToken, providerToken)
        .then(slots => {
          const blocks = mapBusySlotsToBlockKeys(slots);
          setBusyBlocks(blocks);
          setGcalBusyCount(blocks.length);
          setGcalLastSynced(new Date().toISOString());
          setGcalStatus('connected');
          // Remove any already-selected blocks that are now busy
          const busySet = new Set(blocks);
          const remaining = data.weeklyTimeBlocks.filter(k => !busySet.has(k));
          if (remaining.length < data.weeklyTimeBlocks.length) {
            setRemovedBlocksNotice(true);
            updateTimeBlocks(remaining);
          }
        })
        .catch(() => {
          setGcalStatus('sync_failed');
        });
    } else if (wasConnecting) {
      // OAuth was attempted but no provider_token → denied or error
      setGcalStatus('sync_failed');
    } else {
      // Normal load — check cached status from backend.
      // Also restores lastSyncedAt so the connected card shows the correct timestamp
      // on page refresh rather than showing "connected" with no sync date.
      // If the backend says not_connected but the user previously chose manual
      // mode (persisted in the draft's availabilityMode field), restore that
      // choice rather than defaulting back to the initial connect prompt.
      fetchCalendarStatus(accessToken)
        .then(({ status: calStatus, lastSyncedAt }) => {
          if (calStatus === 'connected') {
            setGcalStatus('connected');
            if (lastSyncedAt) setGcalLastSynced(lastSyncedAt);
            fetchBusySlots(accessToken)
              .then(slots => {
                const blocks = mapBusySlotsToBlockKeys(slots);
                setBusyBlocks(blocks);
                setGcalBusyCount(blocks.length);
              })
              .catch(() => {/* non-fatal */});
          } else if (data.availabilityMode === 'manual') {
            // User explicitly chose manual mode in a previous session.
            setGcalStatus('manual_mode');
          }
          // else: stays at 'not_connected' (initial state) — no action needed
        })
        .catch(() => {/* non-fatal */});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, session?.access_token, session?.provider_token]);

  function next() {
    const validation = validateTeacherOnboardingStep(step, data);
    if (!validation.isValid) {
      setStepErrors((prev) => ({ ...prev, [step]: validation.errors }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Require authentication before the teaching-operations step (step 4+).
    // Unauthenticated users see the inline auth gate instead of advancing.
    if (step === 3 && !session) {
      setAuthGateFullName(data.fullName.trim());
      setAuthGateError(null);
      setShowAuthGate(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const nextStep = step + 1;
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    silentSave(data, nextStep);
  }

  function back() {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateTimeBlocks(newBlocks: string[]) {
    // Derive weeklyAvailability (day names) from selected time blocks
    const days = [...new Set(newBlocks.map(b => b.split('-')[0]))].filter(
      (d): d is typeof AVAIL_DAYS[number] => AVAIL_DAYS.includes(d as typeof AVAIL_DAYS[number])
    );
    update({ weeklyTimeBlocks: newBlocks, weeklyAvailability: days });
  }

  async function requestAcademicRepositoryValue(repositoryType: AcademicRepositoryType, requestedName: string) {
    const accessToken = session?.access_token;
    if (!accessToken) {
      setRepositoryRequestErrors((prev) => ({
        ...prev,
        [repositoryType]: 'יש להתחבר לפני שליחת בקשת הוספה לאישור אדמין.',
      }));
      return;
    }

    setRepositoryRequestErrors((prev) => ({ ...prev, [repositoryType]: undefined }));
    const response = await createAcademicRepositoryRequest({ repositoryType, requestedName }, accessToken);
    if ('error' in response) {
      setRepositoryRequestErrors((prev) => ({
        ...prev,
        [repositoryType]: 'לא ניתן לשלוח את הבקשה כרגע. נסו שוב.',
      }));
      return;
    }

    if (repositoryType === 'institution') {
      update({
        institution: '',
        academicInstitutionId: null,
        academicInstitutionName: '',
        academicInstitutionCategory: null,
        academicInstitutionRequestId: response.data.request.id,
        academicInstitutionRequestName: response.data.request.requestedName,
      });
    } else {
      update({
        degree: '',
        academicFieldId: null,
        academicFieldName: '',
        academicFieldCategory: null,
        academicFieldRequestId: response.data.request.id,
        academicFieldRequestName: response.data.request.requestedName,
      });
    }
  }

  async function handleGCalConnect() {
    setGcalConnectError(null);
    setGcalStatus('connecting');
    try {
      // linkIdentity requires an active Supabase session. Validate and refresh
      // before saving/redirecting so expired context state never reaches OAuth.
      const validSession = await ensureCalendarLinkSession();
      // Flush current form state to the DB before the OAuth redirect so it
      // can be restored when the browser returns to this page. We await here
      // so the write completes before navigation leaves the page.
      await saveOnboardingDraft(data, step, validSession.access_token);
      sessionStorage.setItem('sb_gcal_connecting', '1');
      sessionStorage.setItem('sb_gcal_return_step', String(step));
      sessionStorage.setItem('sb_gcal_return_route', '/teacher-onboarding');
      await initiateCalendarConnect();
      // initiateCalendarConnect() causes a full-page redirect — nothing below runs.
    } catch (err) {
      sessionStorage.removeItem('sb_gcal_connecting');
      sessionStorage.removeItem('sb_gcal_return_step');
      sessionStorage.removeItem('sb_gcal_return_route');
      if (err instanceof ReauthRequiredError) {
        setGcalConnectError('session_expired');
        setGcalStatus('sync_failed');
        navigate('/login', { state: { from: { pathname: '/teacher-onboarding' } } });
        return;
      }
      // 403 = session expired or allow_manual_linking disabled in Supabase dashboard.
      const is403 = (err as { status?: number }).status === 403;
      setGcalConnectError(is403 ? 'session_expired' : 'generic');
      setGcalStatus('sync_failed');
    }
  }

  function handleGCalDisconnect() {
    const accessToken = session?.access_token;
    // After disconnecting GCal, revert to manual_mode (not not_connected) so the
    // card shows "Availability set manually" rather than the initial connect prompt.
    setGcalStatus('manual_mode');
    setBusyBlocks([]);
    setGcalBusyCount(0);
    setGcalLastSynced(null);
    setRemovedBlocksNotice(false);
    update({ availabilityMode: 'manual' });
    // Clear the cached provider token — it's only valid while connected to this account.
    try { sessionStorage.removeItem('sb_gcal_provider_token'); } catch { /* ignore */ }
    if (accessToken) {
      disconnectCalendarApi(accessToken).catch(() => {/* non-fatal */});
    }
  }

  // Called when the user explicitly chooses to skip GCal and set availability manually.
  // Marks the state as manual_mode so the card shows the appropriate fallback UI,
  // and flushes the choice to the backend so it survives a page refresh.
  function handleGCalManual() {
    setGcalStatus('manual_mode');
    setGcalConnectError(null);
    update({ availabilityMode: 'manual' });
    silentSave({ ...data, availabilityMode: 'manual' }, step);
  }

  // Called when the user presses "Sync Now" from the connected card.
  // Uses a cached Google provider token (stored in sessionStorage after the initial
  // OAuth sync) so a re-sync can happen without a full OAuth round-trip.
  // Falls back to handleGCalConnect() (re-OAuth) if no cached token is available.
  async function handleGCalSyncNow() {
    const accessToken = session?.access_token;
    if (!accessToken) {
      setGcalConnectError('session_expired');
      setGcalStatus('sync_failed');
      return;
    }

    const cachedProviderToken = sessionStorage.getItem('sb_gcal_provider_token');
    if (cachedProviderToken) {
      setGcalConnectError(null);
      setGcalStatus('syncing');
      try {
        const slots = await syncCalendar(accessToken, cachedProviderToken);
        const blocks = mapBusySlotsToBlockKeys(slots);
        setBusyBlocks(blocks);
        setGcalBusyCount(blocks.length);
        setGcalLastSynced(new Date().toISOString());
        setGcalStatus('connected');
        // Remove any newly-busy blocks the user had previously selected
        const busySet = new Set(blocks);
        const remaining = data.weeklyTimeBlocks.filter(k => !busySet.has(k));
        if (remaining.length < data.weeklyTimeBlocks.length) {
          setRemovedBlocksNotice(true);
          updateTimeBlocks(remaining);
        }
      } catch (err) {
        // 401/403 = provider token expired; clear it so the next attempt triggers OAuth
        const httpStatus = (err as { status?: number }).status;
        if (httpStatus === 401 || httpStatus === 403) {
          try { sessionStorage.removeItem('sb_gcal_provider_token'); } catch { /* ignore */ }
          setGcalConnectError('session_expired');
        } else {
          setGcalConnectError('generic');
        }
        setGcalStatus('sync_failed');
      }
      return;
    }

    // No cached token — re-trigger OAuth so Google issues a fresh one.
    // After the user approves, the OAuth return path runs the sync automatically.
    await handleGCalConnect();
  }

  // Enter loading screen: capture snapshot then go to step 7.
  // isActivatingRef prevents double-submission from rapid clicks.
  function activateProfile() {
    if (isActivatingRef.current) return;
    const validation = validateTeacherOnboardingAll(data);
    if (!validation.isValid && validation.firstInvalidStep !== null) {
      setStepErrors((prev) => ({ ...prev, ...validation.errorsByStep }));
      setCompletionError('חסרים פרטים בטופס. תקנו את השלב המסומן ונסו שוב.');
      setStep(validation.firstInvalidStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    isActivatingRef.current = true;
    setCompletionError(null);
    const token = session?.access_token;
    if (token) {
      completionSnapshotRef.current = { data, token };
    }
    setStep(7);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Auth gate form submission — called when guest submits signup/login.
  // Sets pendingPostAuthType so the post-auth effect can run the correct sync.
  async function handleAuthGateSubmit() {
    if (authGateLoading) return;
    setAuthGateError(null);

    if (!authGateEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authGateEmail.trim())) {
      setAuthGateError('יש להזין כתובת אימייל תקינה.');
      return;
    }

    if (authGatePassword.length < 8) {
      setAuthGateError('הסיסמה חייבת להכיל לפחות 8 תווים.');
      return;
    }

    setAuthGateLoading(true);
    try {
      if (authGateTab === 'signup') {
        await signup({
          email: authGateEmail.trim(),
          password: authGatePassword,
          full_name: (authGateFullName.trim() || data.fullName.trim()) || 'מורה',
          role: 'teacher',
        });
        pendingPostAuthType.current = 'signup';
      } else {
        await login({ email: authGateEmail.trim(), password: authGatePassword });
        pendingPostAuthType.current = 'login';
      }
      // Post-auth sync effect fires once status becomes 'authenticated'.
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'שגיאה';
      if (msg === 'CHECK_EMAIL') {
        setAuthGateError('אימות נשלח לדוא"ל — אשר/י את הכתובת ואז כנסי/י עם "כניסה לחשבון קיים".');
        setAuthGateTab('login');
      } else {
        setAuthGateError(translateAuthGateError(msg));
      }
      pendingPostAuthType.current = null;
    } finally {
      setAuthGateLoading(false);
    }
  }

  // Step 7: run loading animation + call complete API simultaneously
  useEffect(() => {
    if (step !== 7) return;

    const interval = setInterval(() => setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 850);
    const snapshot = completionSnapshotRef.current;

    if (!snapshot) {
      // No auth token — fall back to timed mock (UI-only mode)
      const timer = setTimeout(() => { clearInterval(interval); setStep(8); }, 3600);
      return () => { clearInterval(interval); clearTimeout(timer); };
    }

    let cancelled = false;
    const minDisplay = new Promise<void>((resolve) => setTimeout(resolve, 3600));

    Promise.all([minDisplay, completeOnboarding(snapshot.data, snapshot.token)])
      .then(async ([, response]) => {
        if (cancelled) return;
        clearInterval(interval);
        if ('error' in response) {
          const mapped = mapBackendOnboardingError(response.error, snapshot.data);
          setCompletionError(mapped.message);
          if (mapped.step !== 6) {
            setStepErrors((prev) => ({ ...prev, [mapped.step]: mapped.errors }));
          }
          isActivatingRef.current = false;
          setStep(mapped.step);
        } else {
          setNextRoute(response.data.nextRoute);
          // Refresh the auth context so AuthProvider.profile.onboardingCompleted
          // flips to true before we navigate. Without this, DashboardPlaceholderRoute
          // sees the stale profile and redirects back to /teacher-onboarding.
          await refreshProfile().catch(() => {
            // Non-fatal: if the refresh fails the user still lands on the
            // success screen and can navigate manually. The next page load
            // will pick up the correct profile from /api/auth/me.
          });
          setStep(8);
        }
      })
      .catch(() => {
        if (cancelled) return;
        clearInterval(interval);
        setCompletionError('אירעה שגיאה בהפעלת הפרופיל. אנא נסה שוב.');
        isActivatingRef.current = false;
        setStep(6);
      });

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [step]);

  // ── Initial draft loading / error ─────────────────────────────────────────────
  // Show a spinner while the first GET /api/teachers/me/onboarding is in-flight.
  // Once the draft resolves (or errors), draftLoading becomes false and we render
  // the normal step flow. This prevents a flash of step-1 before the saved step
  // is restored.
  if (draftLoading) {
    return (
      <div
        dir="rtl"
        lang="he"
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <Loader2 size={32} className="animate-spin" style={{ color: SB_ORANGE }} />
          <span style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 500 }}>
            טוען טיוטה...
          </span>
        </div>
      </div>
    );
  }

  if (draftError) {
    return (
      <div
        dir="rtl"
        lang="he"
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 400,
            width: '100%',
            padding: '28px 24px',
            borderRadius: 'var(--radius-lg)',
            border: '2px solid #ef4444',
            background: 'rgba(239,68,68,0.08)',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 15, color: '#ef4444', fontWeight: 700, margin: '0 0 16px' }}>
            {draftError}
          </p>
          <button
            type="button"
            onClick={() => {
              hasFetchedDraftRef.current = false;
              setDraftError(null);
              setDraftLoading(true);
            }}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--radius)',
              border: `2px solid ${SB_ORANGE}`,
              background: SB_ORANGE,
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  // ── Auth gate (shown between step 3 and step 4 for unauthenticated users) ───
  if (showAuthGate) {
    const canSubmit = !authGateLoading && authGateEmail.trim().length > 0 && authGatePassword.length >= 1;
    const btnDisabled = !canSubmit;
    return (
      <OnboardingShell>
        <TeacherOnboardingProgress step={3} totalContentSteps={6} progressPct={STEP_PROGRESS[3]} />
        <StepHeader
          title="כמעט שם — צור/י חשבון"
          subtitle="שמור/י את הפרופיל שלך וגש/י ל-Google Calendar עם חשבון StudyBuddy."
        />

        {/* Tab switcher */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            marginBottom: 24,
            border: '2px solid var(--line-2)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
          }}
        >
          {([
            { key: 'signup' as const, label: 'חשבון חדש', icon: <UserPlus size={14} /> },
            { key: 'login' as const, label: 'יש לי חשבון', icon: <LogIn size={14} /> },
          ]).map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setAuthGateTab(key); setAuthGateError(null); }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                padding: '12px',
                border: 'none',
                background: authGateTab === key ? SB_ORANGE : 'transparent',
                color: authGateTab === key ? '#fff' : 'var(--text-2)',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'var(--font-display)',
                transition: 'all 0.15s ease',
              }}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display: 'grid', gap: 14 }}>
          {authGateTab === 'signup' && (
            <div>
              <SectionLabel>שם מלא</SectionLabel>
              <input
                type="text"
                value={authGateFullName}
                onChange={(e) => setAuthGateFullName(e.target.value)}
                placeholder="השם שיופיע לתלמידים"
                autoComplete="name"
                className="ob-input"
                style={inputStyle}
              />
            </div>
          )}
          <div>
            <SectionLabel>דוא"ל</SectionLabel>
            <input
              type="email"
              value={authGateEmail}
              onChange={(e) => setAuthGateEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="ob-input"
              style={inputStyle}
            />
          </div>
          <div>
            <SectionLabel>סיסמה</SectionLabel>
            <input
              type="password"
              value={authGatePassword}
              onChange={(e) => setAuthGatePassword(e.target.value)}
              placeholder={authGateTab === 'signup' ? 'לפחות 8 תווים' : 'הסיסמה שלך'}
              autoComplete={authGateTab === 'signup' ? 'new-password' : 'current-password'}
              className="ob-input"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Error */}
        {authGateError && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1.5px solid var(--coral)',
              background: 'rgba(226,43,87,0.08)',
              color: 'var(--coral)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {authGateError}
          </div>
        )}

        {/* Nav */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            marginTop: 28,
            position: 'sticky',
            bottom: 0,
            zIndex: 10,
            background: 'var(--surface)',
            padding: '16px 0 28px',
          }}
        >
          <button
            type="button"
            onClick={() => { setShowAuthGate(false); setAuthGateError(null); }}
            className="ob-btn-back"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '12px 18px',
              borderRadius: 'var(--radius)',
              border: '2px solid var(--line-2)',
              background: 'transparent',
              color: 'var(--text-2)',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <ChevronLeft size={15} />
            חזור
          </button>
          <button
            type="button"
            onClick={() => { void handleAuthGateSubmit(); }}
            disabled={btnDisabled}
            className={btnDisabled ? '' : 'ob-btn-next'}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '14px 20px',
              borderRadius: 'var(--radius)',
              border: `2px solid ${btnDisabled ? 'var(--line)' : SB_ORANGE}`,
              background: btnDisabled ? 'transparent' : SB_ORANGE,
              color: btnDisabled ? 'var(--text-3)' : '#fff',
              fontSize: 15,
              fontWeight: 800,
              cursor: btnDisabled ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.01em',
              boxShadow: btnDisabled ? 'none' : `4px 4px 0 rgba(249,115,22,0.3)`,
            }}
          >
            {authGateLoading && <Loader2 size={15} className="animate-spin" />}
            {authGateTab === 'signup' ? 'צור/י חשבון והמשך/י' : 'כנסי/י והמשך/י'}
            {!authGateLoading && !btnDisabled && <ArrowRight size={15} />}
          </button>
        </div>
      </OnboardingShell>
    );
  }

  // ── STEP 1: Identity ─────────────────────────────────────────────────────────
  if (step === 1) {
    const errors = stepErrors[1] ?? {};

    function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => update({ profileImagePreview: ev.target?.result as string });
      reader.readAsDataURL(file);
    }

    return (
      <>
        <SaveIndicator status={draftStatus} />
        <OnboardingShell>
        <TeacherOnboardingProgress step={1} totalContentSteps={6} progressPct={STEP_PROGRESS[1]} />
        <StepHeader
          title="מי את/ה מקצועית?"
          subtitle="נתחיל עם הבסיס. זה ייראה לתלמידים."
        />

        {/* Name + image row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: 16,
            alignItems: 'start',
            marginBottom: 24,
          }}
        >
          {/* Image upload */}
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="ob-upload"
              style={{
                width: 72,
                height: 72,
                borderRadius: 'var(--radius)',
                border: `2px dashed ${data.profileImagePreview ? SB_ORANGE : 'var(--line-2)'}`,
                background: data.profileImagePreview ? 'transparent' : 'var(--surface-2)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                overflow: 'hidden',
              }}
            >
              {data.profileImagePreview ? (
                <img
                  src={data.profileImagePreview}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <>
                  <Upload size={16} style={{ color: 'var(--text-3)' }} />
                  <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, lineHeight: 1 }}>תמונה</span>
                </>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
          </div>

          {/* Name */}
          <div>
            <SectionLabel>שם מלא</SectionLabel>
            <input
              type="text"
              placeholder="השם שלך כפי שיופיע לתלמידים..."
              value={data.fullName}
              onChange={(e) => update({ fullName: e.target.value })}
              autoFocus
              className="ob-input"
              style={inputStyle}
            />
            <FieldError message={errors.fullName} />
          </div>
        </div>

        <Divider />

        {/* Professional status */}
        <div>
          <SectionLabel>מעמד מקצועי</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PROFESSIONAL_STATUS_OPTIONS.map((opt) => (
              <SelectableChip
                key={opt.value}
                label={opt.label}
                selected={data.professionalStatus === opt.value}
                onClick={() => update({ professionalStatus: opt.value as ProfessionalStatus })}
              />
            ))}
          </div>
          <FieldError message={errors.professionalStatus} />
        </div>

        {/* Hint */}
        {data.professionalStatus && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line)',
              background: 'rgba(255,255,255,0.025)',
              fontSize: 13,
              color: 'var(--text-2)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {isAcademicPath(data.professionalStatus) ? (
              <GraduationCap size={14} style={{ color: SB_ORANGE, flexShrink: 0 }} />
            ) : (
              <Briefcase size={14} style={{ color: SB_ORANGE, flexShrink: 0 }} />
            )}
            בשלב הבא נמלא את הרקע האקדמי / המקצועי שלך.
          </div>
        )}

        <NavButtons hideBack onNext={next} />
      </OnboardingShell>
      </>
    );
  }

  // ── STEP 2: Background ───────────────────────────────────────────────────────
  if (step === 2) {
    const academic = isAcademicPath(data.professionalStatus);
    const errors = stepErrors[2] ?? {};

    return (
      <OnboardingShell>
        <TeacherOnboardingProgress step={2} totalContentSteps={6} progressPct={STEP_PROGRESS[2]} />
        <StepHeader
          title={academic ? 'רקע אקדמי' : 'ניסיון ומומחיות'}
          subtitle={academic ? 'מוסד, תחום לימוד ושנה — נבנה ממנו את כרטיס הפרופיל שלך.' : 'הניסיון שלך בשטח הוא הכרטיס הביקור שלך.'}
        />

        {academic ? (
          <div style={{ display: 'grid', gap: 18 }}>
            <AcademicRepositoryAutocomplete
              label="מוסד לימודים"
              placeholder="חיפוש מוסד בעברית או באנגלית..."
              items={academicInstitutions}
              selectedName={data.academicInstitutionName}
              selectedCategory={data.academicInstitutionCategory}
              pendingName={data.academicInstitutionRequestName}
              error={errors.institution}
              requestError={repositoryRequestErrors.institution}
              requestDisabled={!session?.access_token}
              onSelect={(item) => update({
                institution: '',
                academicInstitutionId: item.id,
                academicInstitutionName: item.name,
                academicInstitutionCategory: item.category,
                academicInstitutionRequestId: null,
                academicInstitutionRequestName: '',
              })}
              onRequestAdd={(name) => requestAcademicRepositoryValue('institution', name)}
            />
            <AcademicRepositoryAutocomplete
              label="תחום לימוד / תואר"
              placeholder="חיפוש תחום לימוד בעברית או באנגלית..."
              items={academicFields}
              selectedName={data.academicFieldName}
              selectedCategory={data.academicFieldCategory}
              pendingName={data.academicFieldRequestName}
              error={errors.degree}
              requestError={repositoryRequestErrors.field}
              requestDisabled={!session?.access_token}
              onSelect={(item) => update({
                degree: '',
                academicFieldId: item.id,
                academicFieldName: item.name,
                academicFieldCategory: item.category,
                academicFieldRequestId: null,
                academicFieldRequestName: '',
              })}
              onRequestAdd={(name) => requestAcademicRepositoryValue('field', name)}
            />
            <div>
              <SectionLabel>שנת לימוד</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ACADEMIC_YEAR_OPTIONS.map((yr) => (
                  <SelectableChip
                    key={yr}
                    label={yr}
                    selected={data.academicYear === yr}
                    onClick={() => update({ academicYear: yr })}
                    small
                  />
                ))}
              </div>
              <FieldError message={errors.academicYear} />
            </div>
            <div>
              <SectionLabel>קורסים בהצטיינות (אופציונלי)</SectionLabel>
              <textarea
                placeholder='לדוגמה: חשבון אינפינטסימלי א — 98, אלגברה לינארית — 95...'
                value={data.excellentCourses}
                onChange={(e) => update({ excellentCourses: e.target.value })}
                rows={3}
                className="ob-input"
                style={{ ...inputStyle, resize: 'vertical' } as React.CSSProperties}
              />
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 18 }}>
            <div>
              <SectionLabel>שנות ניסיון</SectionLabel>
              <input
                type="number"
                placeholder='מספר שנות הניסיון הרלוונטי...'
                value={data.yearsOfExperience}
                onChange={(e) => update({ yearsOfExperience: e.target.value })}
                min={0}
                className="ob-input"
                style={inputStyle}
              />
              <FieldError message={errors.yearsOfExperience} />
            </div>
            <div>
              <SectionLabel>תחומי מומחיות</SectionLabel>
              <input
                type="text"
                placeholder='לדוגמה: פיתוח תוכנה, אלגוריתמים, Data Science...'
                value={data.expertiseAreas}
                onChange={(e) => update({ expertiseAreas: e.target.value })}
                className="ob-input"
                style={inputStyle}
              />
              <FieldError message={errors.expertiseAreas} />
            </div>
            <div>
              <SectionLabel>העלאת תעודות / אישורים (אופציונלי)</SectionLabel>
              <div
                className="ob-upload"
                style={{
                  border: '2px dashed var(--line-2)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '20px',
                  textAlign: 'center',
                  color: 'var(--text-3)',
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Upload size={18} />
                <span>גרור/י קובץ לכאן או לחץ/י לבחירה</span>
                <span style={{ fontSize: 11, opacity: 0.6 }}>PDF, JPG, PNG — עד 5MB</span>
              </div>
            </div>
          </div>
        )}

        <NavButtons onBack={back} onNext={next} />
      </OnboardingShell>
    );
  }

  // ── STEP 3: Subjects, Levels & Style ─────────────────────────────────────────
  if (step === 3) {
    const availableSubjects = data.teachingLevels.flatMap((lvl) => SUBJECTS_BY_LEVEL[lvl]);
    const uniqueSubjects = [...new Set(availableSubjects)];
    const errors = stepErrors[3] ?? {};

    function toggleLevel(lvl: typeof TEACHING_LEVELS[number]['value']) {
      const next = data.teachingLevels.includes(lvl)
        ? data.teachingLevels.filter((l) => l !== lvl)
        : [...data.teachingLevels, lvl];
      update({
        teachingLevels: next,
        selectedSubjects: data.selectedSubjects.filter((s) =>
          [...new Set(next.flatMap((l) => SUBJECTS_BY_LEVEL[l]))].includes(s)
        ),
      });
    }

    return (
      <OnboardingShell>
        <TeacherOnboardingProgress step={3} totalContentSteps={6} progressPct={STEP_PROGRESS[3]} />
        <StepHeader
          title="מקצועות, רמות וסגנון"
          subtitle="הגדר/י את פרופיל ההוראה — זה מה שיתאים בינך לתלמידים."
        />

        {/* Levels — responsive 4→2 col */}
        <div style={{ marginBottom: 22 }}>
          <SectionLabel>רמות הוראה</SectionLabel>
          <div className="ob-level-grid">
            {TEACHING_LEVELS.map((lvl) => (
              <SelectableCard
                key={lvl.value}
                label={lvl.label}
                selected={data.teachingLevels.includes(lvl.value)}
                onClick={() => toggleLevel(lvl.value)}
                fullWidth
              />
            ))}
          </div>
          <FieldError message={errors.teachingLevels} />
        </div>

        {/* Subjects */}
        {data.teachingLevels.length === 0 ? (
          <div
            style={{
              marginBottom: 22,
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px dashed var(--line-2)',
              color: 'var(--text-3)',
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <BookOpen size={14} style={{ flexShrink: 0, opacity: 0.5 }} />
            בחר/י רמת הוראה כדי לראות מקצועות זמינים
          </div>
        ) : (
          <div style={{ marginBottom: 22 }}>
            <SectionLabel>מקצועות <span style={{ color: SB_ORANGE }}>({data.selectedSubjects.length} נבחרו)</span></SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {uniqueSubjects.map((s) => (
                <SelectableChip
                  key={s}
                  label={s}
                  selected={data.selectedSubjects.includes(s)}
                  onClick={() => update({ selectedSubjects: toggleItem(data.selectedSubjects, s) })}
                  small
                />
              ))}
            </div>
            <FieldError message={errors.selectedSubjects} />
          </div>
        )}
        {data.teachingLevels.length === 0 && <FieldError message={errors.selectedSubjects} />}

        {/* Selected subjects preview */}
        {data.selectedSubjects.length > 0 && (
          <div
            style={{
              marginBottom: 22,
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid rgba(249,115,22,0.2)`,
              background: SB_ORANGE_SOFT,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: SB_ORANGE, marginBottom: 8, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              נבחרו
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {data.selectedSubjects.map((s) => (
                <span
                  key={s}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: SB_ORANGE,
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => update({ selectedSubjects: data.selectedSubjects.filter((x) => x !== s) })}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: 'rgba(255,255,255,0.75)',
                      lineHeight: 1,
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <Divider />

        {/* Teaching styles */}
        <div>
          <SectionLabel>סגנון הוראה</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TEACHING_STYLES.map((style) => (
              <SelectableChip
                key={style.value}
                label={style.label}
                selected={data.teachingStyles.includes(style.value)}
                onClick={() => update({ teachingStyles: toggleItem(data.teachingStyles, style.value) })}
                small
              />
            ))}
          </div>
        </div>

        <NavButtons onBack={back} onNext={next} />
      </OnboardingShell>
    );
  }

  // ── STEP 4: Teaching Operations Engine ───────────────────────────────────────
  if (step === 4) {
    const errors = stepErrors[4] ?? {};
    const weeklyCapacity =
      data.maxActiveStudents !== null && data.weeklyTeachingHours !== null
        ? `${data.maxActiveStudents} תלמידים · ${data.weeklyTeachingHours} שעות/שבוע`
        : null;

    const feedbackLines = [
      weeklyCapacity ? `קיבולת: ${weeklyCapacity}` : null,
      data.bookingApproval
        ? `הזמנות: ${data.bookingApproval === 'automatic' ? 'אישור אוטומטי' : `ידני, SLA ${data.slaHours ?? '—'} שעות`}`
        : null,
      data.emergencyAvailability
        ? `חירום: ${EMERGENCY_AVAILABILITY_OPTIONS.find((o) => o.value === data.emergencyAvailability)?.label ?? ''}`
        : null,
      data.weeklyTimeBlocks.length > 0
        ? `זמינות: ${data.weeklyTimeBlocks.length} בלוקים (${data.weeklyAvailability.join(', ')})`
        : null,
    ].filter(Boolean) as string[];

    return (
      <OnboardingShell wide>
        <TeacherOnboardingProgress step={4} totalContentSteps={6} progressPct={STEP_PROGRESS[4]} />
        <StepHeader
          title="מנוע ההוראה שלך"
          subtitle="הגדר/י את ההיגיון התפעולי המלא — זמינות, קיבולת, חוקי הזמנה, מחויבות."
        />

        <div style={{ display: 'grid', gap: 14 }}>
          {/* 1. Availability */}
          <OpsSection title="מנוע זמינות" icon={<Calendar size={14} />} color="var(--blue)">
            {/* Google Calendar card */}
            <div style={{ marginBottom: 16 }}>
              <SectionLabel>סנכרון יומן</SectionLabel>
              <GoogleCalendarCard
                status={gcalStatus}
                lastSynced={gcalLastSynced}
                busyCount={gcalBusyCount}
                onConnect={handleGCalConnect}
                onDisconnect={handleGCalDisconnect}
                onManual={handleGCalManual}
                onSync={handleGCalSyncNow}
                errorHint={gcalConnectError ?? undefined}
              />
            </div>

            {/* Weekly calendar grid */}
            <div>
              <SectionLabel>זמינות שבועית קבועה</SectionLabel>
              <TeacherAvailabilityCalendar
                selectedBlocks={data.weeklyTimeBlocks}
                busyBlocks={busyBlocks}
                onChange={updateTimeBlocks}
              />
              {removedBlocksNotice && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--coral)', fontWeight: 600 }}>
                  חלק מהשעות הוסרו כי הן תפוסות ביומן Google
                </div>
              )}
              <FieldError message={errors.weeklyTimeBlocks} />
            </div>

            {/* Quick presets */}
            <div style={{ marginTop: 12 }}>
              <SectionLabel>פרסטים מהירים</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { label: 'כל ימי חול', days: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'] as const },
                  { label: 'ימי שישי', days: ['שישי'] as const },
                  { label: 'ערבים בלבד (א–ה)', days: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'] as const, blocks: ['evening'] as const },
                ].map(preset => (
                  <button key={preset.label} type="button" onClick={() => {
                    if ('blocks' in preset && preset.blocks) {
                      const newKeys = preset.days.flatMap(d => preset.blocks!.map(b => makeBlockKey(d as typeof AVAIL_DAYS[number], b as 'morning' | 'afternoon' | 'evening')));
                      updateTimeBlocks([...new Set([...data.weeklyTimeBlocks, ...newKeys])]);
                    } else {
                      const newKeys = preset.days.flatMap(d => (['morning', 'afternoon', 'evening'] as const).map(b => makeBlockKey(d as typeof AVAIL_DAYS[number], b)));
                      updateTimeBlocks([...new Set([...data.weeklyTimeBlocks, ...newKeys])]);
                    }
                  }} className="ob-chip" style={{ padding: '5px 12px', borderRadius: 999, border: '1px solid var(--line-2)', background: 'transparent', color: 'var(--text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Zap size={10} style={{ color: SB_ORANGE }} />
                    {preset.label}
                  </button>
                ))}
                {data.weeklyTimeBlocks.length > 0 && (
                  <button type="button" onClick={() => updateTimeBlocks([])} className="ob-chip" style={{ padding: '5px 12px', borderRadius: 999, border: '1px solid var(--line-2)', background: 'transparent', color: 'var(--text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    נקה הכל
                  </button>
                )}
              </div>
            </div>
          </OpsSection>

          {/* 2. Capacity */}
          <OpsSection title="מנוע קיבולת" icon={<Users size={14} />} color="var(--purple)">
            <div style={{ marginBottom: 14 }}>
              <SectionLabel>תלמידים פעילים (מקסימום)</SectionLabel>
              <NumberChipRow
                options={MAX_STUDENTS_OPTIONS}
                selected={data.maxActiveStudents}
                onSelect={(v) => update({ maxActiveStudents: v })}
                suffix=" תלמידים"
              />
              <FieldError message={errors.maxActiveStudents} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <SectionLabel>שעות שבועיות (מקסימום)</SectionLabel>
              <NumberChipRow
                options={WEEKLY_HOURS_OPTIONS}
                selected={data.weeklyTeachingHours}
                onSelect={(v) => update({ weeklyTeachingHours: v })}
                suffix=" ש׳"
              />
              <FieldError message={errors.weeklyTeachingHours} />
            </div>
            <OpsToggle
              label="עצור קבלת תלמידים חדשים אוטומטית בהגעה לקיבולת"
              checked={data.autoStopMatching}
              onChange={(v) => update({ autoStopMatching: v })}
            />
          </OpsSection>

          {/* 3. Booking Rules */}
          <OpsSection title="חוקי הזמנה" icon={<BookOpen size={14} />} color="var(--gold)">
            <div style={{ marginBottom: 14 }}>
              <SectionLabel>אישור הזמנות</SectionLabel>
              <div className="ob-ops-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <SelectableCard
                  icon={<Zap size={15} />}
                  label="אישור אוטומטי"
                  description="הזמנות מאושרות מיד"
                  selected={data.bookingApproval === 'automatic'}
                  onClick={() => update({ bookingApproval: 'automatic' })}
                />
                <SelectableCard
                  icon={<Check size={15} />}
                  label="אישור ידני"
                  description="אתה/את מאשר/ת כל הזמנה"
                  selected={data.bookingApproval === 'manual'}
                  onClick={() => update({ bookingApproval: 'manual' })}
                />
              </div>
              <FieldError message={errors.bookingApproval} />
            </div>
            {data.bookingApproval === 'manual' && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <SectionLabel>SLA — זמן תגובה מקסימלי</SectionLabel>
                  <NumberChipRow
                    options={SLA_HOURS_OPTIONS}
                    selected={data.slaHours}
                    onSelect={(v) => update({ slaHours: v })}
                    suffix=" שעות"
                  />
                  <FieldError message={errors.slaHours} />
                </div>
                <div>
                  <SectionLabel>פעולה אוטומטית לאחר SLA</SectionLabel>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { value: 'approve' as const, label: 'אשר אוטומטית' },
                      { value: 'decline' as const, label: 'דחה אוטומטית' },
                    ].map((opt) => (
                      <SelectableChip
                        key={opt.value}
                        label={opt.label}
                        selected={data.slaAutoAction === opt.value}
                        onClick={() => update({ slaAutoAction: opt.value })}
                        small
                      />
                    ))}
                  </div>
                  <FieldError message={errors.slaAutoAction} />
                </div>
              </>
            )}
          </OpsSection>

          {/* 4. Commitment */}
          <OpsSection title="העדפות מחויבות" icon={<Award size={14} />} color="var(--lime)">
            <div className="ob-ops-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {COMMITMENT_TYPES.map((ct) => (
                <SelectableCard
                  key={ct.value}
                  label={ct.label}
                  selected={data.commitmentTypes.includes(ct.value)}
                  onClick={() => update({ commitmentTypes: toggleItem(data.commitmentTypes, ct.value) })}
                />
              ))}
            </div>
            <FieldError message={errors.commitmentTypes} />
            {data.commitmentTypes.includes('exam_marathons') && (
              <div style={{ marginTop: 14 }}>
                <SectionLabel>מספר שיעורים למרתון</SectionLabel>
                <NumberChipRow
                  options={MARATHON_SESSION_OPTIONS}
                  selected={data.marathonSessionCount}
                  onSelect={(v) => update({ marathonSessionCount: v })}
                  suffix=" שיעורים"
                />
                <FieldError message={errors.marathonSessionCount} />
              </div>
            )}
          </OpsSection>

          {/* 5. Emergency */}
          <OpsSection title="שיעורי חירום" icon={<Zap size={14} />} color="var(--coral)">
            <SectionLabel>זמינות לשיעורים דחופים (תוך 24 שעות)</SectionLabel>
            <div style={{ display: 'flex', gap: 8 }}>
              {EMERGENCY_AVAILABILITY_OPTIONS.map((opt) => (
                <SelectableChip
                  key={opt.value}
                  label={opt.label}
                  selected={data.emergencyAvailability === opt.value}
                  onClick={() => update({ emergencyAvailability: opt.value })}
                />
              ))}
            </div>
            <FieldError message={errors.emergencyAvailability} />
          </OpsSection>

          {/* 6. Realtime feedback */}
          <div
            style={{
              border: `2px solid rgba(249,115,22,0.28)`,
              borderRadius: 'var(--radius)',
              padding: '16px 20px',
              background:
                'linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(249,115,22,0.04) 100%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: feedbackLines.length ? 12 : 0 }}>
              <BarChart2 size={14} style={{ color: SB_ORANGE }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: SB_ORANGE, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                סיכום תפעולי
              </span>
            </div>
            {feedbackLines.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic' }}>
                מלא/י את הפרטים למעלה לצפייה בסיכום
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 6 }}>
                {feedbackLines.map((line) => (
                  <div key={line} style={{ fontSize: 13, color: 'var(--text)', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Check size={12} style={{ color: SB_ORANGE, flexShrink: 0 }} />
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <NavButtons onBack={back} onNext={next} />
      </OnboardingShell>
    );
  }

  // ── STEP 5: Pricing & Legal ───────────────────────────────────────────────────
  if (step === 5) {
    const allRequiredChecked = data.legalTax && data.legalContractor && data.legalMinors && data.legalCommunity;
    const rateNum = parseFloat(data.hourlyRate);
    const errors = stepErrors[5] ?? {};

    return (
      <OnboardingShell>
        <TeacherOnboardingProgress step={5} totalContentSteps={6} progressPct={STEP_PROGRESS[5]} />
        <StepHeader
          title="תמחור וחוקיות"
          subtitle="הגדר/י מחיר ואשר/י את ההצהרות הנדרשות כדי להמשיך."
        />

        {/* Pricing */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>מחיר שעת שיעור</SectionLabel>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <span
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-3)',
                pointerEvents: 'none',
                display: 'flex',
              }}
            >
              <DollarSign size={15} />
            </span>
            <input
              type="number"
              placeholder="לדוגמה: 120"
              value={data.hourlyRate}
              onChange={(e) => update({ hourlyRate: e.target.value })}
              min={0}
              className="ob-input"
              style={{ ...inputStyle, paddingRight: 36 }}
            />
            <FieldError message={errors.hourlyRate} />
          </div>

          {data.hourlyRate && !isNaN(rateNum) && (
            <>
              <SectionLabel>תמחור שיעור מבוא</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {INTRO_PRICING_OPTIONS.map((opt) => (
                  <SelectableCard
                    key={opt.value}
                    label={opt.label}
                    description={
                      opt.value === 'half_price'
                        ? `₪${(rateNum / 2).toFixed(0)}`
                        : opt.value === 'twenty_percent'
                        ? `₪${(rateNum * 0.8).toFixed(0)}`
                        : `₪${data.hourlyRate}`
                    }
                    selected={data.introSessionPricing === opt.value}
                    onClick={() => update({ introSessionPricing: opt.value })}
                  />
                ))}
              </div>
              <FieldError message={errors.introSessionPricing} />
            </>
          )}
          {!data.hourlyRate && <FieldError message={errors.introSessionPricing} />}
        </div>

        <Divider />

        {/* Legal checkboxes */}
        <div
          style={{
            border: '2px solid var(--line-2)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
            boxShadow: '3px 3px 0 rgba(0,0,0,0.22)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 18px',
              background: 'rgba(255,255,255,0.03)',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <Shield size={15} style={{ color: 'var(--lime)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
              הצהרות חובה
            </span>
            <span
              style={{
                marginRight: 'auto',
                fontSize: 11,
                fontWeight: 700,
                color: allRequiredChecked ? 'var(--lime)' : 'var(--text-3)',
                fontFamily: 'var(--font-mono)',
                transition: 'color 0.2s ease',
              }}
            >
              {[data.legalTax, data.legalContractor, data.legalMinors, data.legalCommunity].filter(Boolean).length}/4
            </span>
          </div>

          <div style={{ padding: '14px 18px', display: 'grid', gap: 12 }}>
            {[
              { key: 'legalTax' as const, label: 'אני מבין/ה את האחריות הפיננסית שלי ואת חובות הדיווח לרשויות המס.' },
              { key: 'legalContractor' as const, label: 'אני פועל/ת כקבלן/ית עצמאי/ת ולא כשכיר/ה של StudyBuddy.' },
              { key: 'legalMinors' as const, label: 'קראתי ומאשר/ת את הצהרת הבטיחות לקטינים.' },
              { key: 'legalCommunity' as const, label: 'אני מתחייב/ת לעמוד בתקנון הקהילה של StudyBuddy.' },
            ].map((item) => (
              <label
                key={item.key}
                className="ob-legal-row"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  cursor: 'pointer',
                }}
                onClick={() => update({ [item.key]: !data[item.key] })}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    border: `2px solid ${data[item.key] ? SB_ORANGE : 'var(--line-2)'}`,
                    background: data[item.key] ? SB_ORANGE : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 1,
                    transition: 'all 0.18s ease',
                  } as React.CSSProperties}
                >
                  {data[item.key] && (
                    <span className="ob-check-pop" style={{ display: 'flex' }}>
                      <Check size={11} color="#fff" />
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 13,
                    color: data[item.key] ? 'var(--text)' : 'var(--text-2)',
                    lineHeight: 1.55,
                    fontWeight: data[item.key] ? 600 : 500,
                    transition: 'color 0.15s ease',
                  }}
                >
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Optional background check */}
        <div
          style={{
            marginTop: 14,
            border: '1px dashed var(--line-2)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <FileText size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>אישור היעדר עבירות מין</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              אופציונלי — מגביר משמעותית את אמון התלמידים
            </div>
          </div>
          <button
            type="button"
            className="ob-chip"
            style={{
              marginRight: 'auto',
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid var(--line-2)',
              background: 'transparent',
              color: 'var(--text-3)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            העלה
          </button>
        </div>

        {!allRequiredChecked && (
          <div
            style={{
              marginTop: 12,
              fontSize: 13,
              color: 'var(--coral)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Shield size={12} />
            יש לאשר את כל ארבע ההצהרות להמשך
          </div>
        )}
        <FieldError message={errors.legal} />

        <NavButtons
          onBack={back}
          onNext={next}
          nextLabel="המשך לתצוגה מקדימה"
        />
      </OnboardingShell>
    );
  }

  // ── STEP 6: Preview ───────────────────────────────────────────────────────────
  if (step === 6) {
    return (
      <OnboardingShell>
        <TeacherOnboardingProgress step={6} totalContentSteps={6} progressPct={STEP_PROGRESS[6]} />
        <StepHeader
          title="כך תיראה הכרטיסייה שלך"
          subtitle="זה מה שתלמידים יראו. ודא/י שהכל נכון לפני ההפעלה."
        />

        {completionError && (
          <div
            style={{
              marginBottom: 16,
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '2px solid #ef4444',
              background: 'rgba(239,68,68,0.08)',
              color: '#ef4444',
              fontSize: 13,
              fontWeight: 600,
              direction: 'rtl',
            }}
          >
            {completionError}
          </div>
        )}

        <TeacherPreviewCard data={data} />

        <NavButtons
          onBack={back}
          onNext={activateProfile}
          nextLabel="סיימתי — אפשר להתחיל לקבל תלמידים"
        />
      </OnboardingShell>
    );
  }

  // ── STEP 7: Loading ───────────────────────────────────────────────────────────
  if (step === 7) {
    return (
      <div
        dir="rtl"
        lang="he"
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          padding: 24,
        }}
      >
        <div
          className="ob-step-enter"
          style={{
            width: '100%',
            maxWidth: 440,
            overflow: 'hidden',
            borderRadius: 'var(--radius-lg)',
            border: `2px solid rgba(249,115,22,0.45)`,
            background: 'var(--surface)',
            boxShadow: `5px 5px 0 rgba(249,115,22,0.22), 0 24px 60px -32px rgba(0,0,0,0.7)`,
          }}
        >
          {/* Top stripe */}
          <div
            style={{
              height: 4,
              background: `linear-gradient(90deg, ${SB_ORANGE}, #fb923c, rgba(249,115,22,0.3))`,
            }}
          />

          <div style={{ padding: '32px 28px 28px', textAlign: 'center' }}>
            {/* Spinner */}
            <div style={{ marginBottom: 20, color: SB_ORANGE, display: 'flex', justifyContent: 'center' }}>
              <Loader2 size={40} className="animate-spin" />
            </div>

            <h2
              style={{
                margin: '0 0 6px',
                fontSize: 20,
                fontWeight: 800,
                color: 'var(--text)',
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.02em',
              }}
            >
              מפעילים את סביבת ההוראה שלך
            </h2>

            <p
              style={{
                margin: '0 0 22px',
                fontSize: 13,
                color: SB_ORANGE,
                fontWeight: 700,
                minHeight: 20,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.01em',
                transition: 'opacity 0.3s ease',
              }}
            >
              {LOADING_MESSAGES[loadingMsgIdx]}
            </p>

            {/* Progress bar */}
            <div
              style={{
                height: 6,
                background: 'var(--line-2)',
                borderRadius: 99,
                overflow: 'hidden',
                marginBottom: 20,
              }}
            >
              <div
                className="ob-progress-bar"
                style={{
                  width: `${Math.round(((loadingMsgIdx + 1) / LOADING_MESSAGES.length) * 100)}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${SB_ORANGE}, #fb923c)`,
                  borderRadius: 99,
                  transition: 'width 0.7s cubic-bezier(0.2, 0.8, 0.2, 1)',
                }}
              />
            </div>

            {/* Step checklist */}
            <div style={{ display: 'grid', gap: 8 }}>
              {LOADING_MESSAGES.map((msg, i) => (
                <div
                  key={msg}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--line)',
                    background: i <= loadingMsgIdx ? SB_ORANGE_SOFT : 'transparent',
                    transition: 'all 0.35s ease',
                    textAlign: 'right',
                  }}
                >
                  <span style={{ color: i <= loadingMsgIdx ? SB_ORANGE : 'var(--text-3)', flexShrink: 0 }}>
                    {i <= loadingMsgIdx ? (
                      <Check size={13} />
                    ) : (
                      <div
                        style={{
                          width: 13,
                          height: 13,
                          borderRadius: '50%',
                          border: '2px solid var(--line-2)',
                        }}
                      />
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: i <= loadingMsgIdx ? 'var(--text)' : 'var(--text-3)',
                      fontWeight: i <= loadingMsgIdx ? 600 : 500,
                      transition: 'color 0.3s ease',
                    }}
                  >
                    {msg}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 8: Success ───────────────────────────────────────────────────────────
  // ── STEP 8: Success ───────────────────────────────────────────────────────────
  return (
    <div
      dir="rtl"
      lang="he"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: 24,
      }}
    >
      <div
        className="ob-step-enter"
        style={{
          width: '100%',
          maxWidth: 440,
          overflow: 'hidden',
          borderRadius: 'var(--radius-lg)',
          border: `2px solid rgba(249,115,22,0.45)`,
          background: 'var(--surface)',
          boxShadow: `5px 5px 0 rgba(249,115,22,0.22), 0 24px 60px -32px rgba(0,0,0,0.7)`,
        }}
      >
        {/* Top stripe */}
        <div
          style={{
            height: 4,
            background: `linear-gradient(90deg, ${SB_ORANGE}, #fb923c, var(--lime))`,
          }}
        />

        <div style={{ padding: '36px 28px 32px', textAlign: 'center' }}>
          {/* Animated icon */}
          <div
            style={{
              position: 'relative',
              width: 68,
              height: 68,
              margin: '0 auto 22px',
            }}
          >
            <div
              className="ob-success-ring"
              style={{
                position: 'relative',
                width: 68,
                height: 68,
                borderRadius: 'var(--radius)',
                background: SB_ORANGE_SOFT,
                border: `2px solid ${SB_ORANGE}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `4px 4px 0 rgba(249,115,22,0.3)`,
              }}
            >
              <CheckCircle2 size={34} style={{ color: SB_ORANGE }} />
            </div>
          </div>

          <h1
            style={{
              margin: '0 0 10px',
              fontSize: 24,
              fontWeight: 900,
              color: 'var(--text)',
              fontFamily: 'var(--font-display)',
              lineHeight: 1.15,
              letterSpacing: '-0.025em',
            }}
          >
            סביבת ההוראה שלך מוכנה
          </h1>

          <p
            style={{
              margin: '0 0 6px',
              fontSize: 15,
              color: 'var(--text-2)',
              lineHeight: 1.6,
              fontWeight: 500,
            }}
          >
            הפרופיל שלך פעיל ומוכן לקבלת תלמידים.
          </p>
          <p style={{ margin: '0 0 26px', fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5 }}>
            {data.fullName ? `ברוך/ה הבא/ה, ${data.fullName}. ` : ''}מנוע ההתאמות כבר עובד בשבילך.
          </p>

          {/* Stats strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 1,
              marginBottom: 24,
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              border: '1px solid var(--line-2)',
            }}
          >
            {[
              { label: 'מקצועות', value: data.selectedSubjects.length > 0 ? data.selectedSubjects.length : '—' },
              { label: 'תלמידים', value: data.maxActiveStudents ? `עד ${data.maxActiveStudents}` : '—' },
              { label: '₪ / שעה', value: data.hourlyRate || '—' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                style={{
                  padding: '12px 8px',
                  background: i === 1 ? 'rgba(249,115,22,0.08)' : 'var(--surface-2)',
                  borderLeft: i > 0 ? '1px solid var(--line-2)' : 'none',
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    color: SB_ORANGE,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {stat.value}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, fontWeight: 500 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={() => navigate(nextRoute)}
            className="ob-btn-next"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '15px 24px',
              borderRadius: 'var(--radius)',
              border: `2px solid ${SB_ORANGE}`,
              background: SB_ORANGE,
              color: '#fff',
              fontSize: 16,
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.015em',
              boxShadow: `4px 4px 0 rgba(249,115,22,0.3)`,
              marginBottom: 12,
            }}
          >
            כניסה לדשבורד
            <ArrowRight size={17} />
          </button>

          <div
            style={{
              fontSize: 12,
              color: 'var(--text-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            <ShieldCheck size={12} />
            הפרופיל עמד בכל בדיקות האימות
          </div>
        </div>
      </div>
    </div>
  );
}
