import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, Loader2, CheckCircle2,
  CalendarCheck, CalendarX, RefreshCw, Link2Off,
} from 'lucide-react';
import { FlowNav } from '../components/FlowNav';
import { TeacherAvailabilityCalendar, AVAIL_DAYS } from '../components/onboarding/TeacherAvailabilityCalendar';
import type { GCalStatus, BusySlot } from '../api/teacherCalendar';
import { mapBusySlotsToBlockKeys as mapBusySlotsToBlockKeysShared } from '../utils/mapBusySlotsToBlockKeys';
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
  ACADEMIC_YEAR_OPTIONS,
  LOADING_MESSAGES,
  STEP_PROGRESS_V2,
  TOTAL_SCREENS_V2,
  ACADEMIC_PATH_STATUSES,
  type TeachingLevel,
  type ProfessionalStatus,
} from '../content/teacherOnboardingContent';
// v2 redesign — scoped wizard primitives + per-screen components.
import { WizardShell, NavButtons as TowNavButtons, ChipSelect as TowChipSelect } from '../components/onboarding/v2/primitives';
import { NeonProgressTracker } from '../components/onboarding/v2/NeonProgressTracker';
import { Screen1AccountConnection } from '../components/onboarding/v2/screens/Screen1AccountConnection';
import { Screen2Experience } from '../components/onboarding/v2/screens/Screen2Experience';
import { Screen3SubjectsStyle } from '../components/onboarding/v2/screens/Screen3SubjectsStyle';
import { Screen4Availability } from '../components/onboarding/v2/screens/Screen4Availability';
import { Screen5Operations } from '../components/onboarding/v2/screens/Screen5Operations';
import { Screen6Pricing } from '../components/onboarding/v2/screens/Screen6Pricing';
import { Screen7Verifications } from '../components/onboarding/v2/screens/Screen7Verifications';
import { Screen8Preview } from '../components/onboarding/v2/screens/Screen8Preview';
import { towTokens as TOW } from '../design/tokens';

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

  // v2 content-step indices (Account Connection is the auth-gate overlay = screen 1):
  //   1 Experience  2 Subjects  3 Availability  4 Operations  5 Pricing  6 Verifications  7 Preview
  if (step === 1) {
    if (formState.fullName.trim().length < 2) errors.fullName = 'יש להזין שם מלא.';
    if (!formState.professionalStatus) errors.professionalStatus = 'יש לבחור מעמד מקצועי.';
    if (formState.professionalStatus) {
      if (isAcademicPath(formState.professionalStatus)) {
        if (!formState.academicInstitutionId && !formState.academicInstitutionRequestId) errors.institution = 'יש לבחור מוסד לימודים מתוך הרשימה או לשלוח בקשת הוספה.';
        if (!formState.academicFieldId && !formState.academicFieldRequestId) errors.degree = 'יש לבחור תחום לימוד מתוך הרשימה או לשלוח בקשת הוספה.';
        if (!formState.academicYear) errors.academicYear = 'יש לבחור שנת לימוד.';
      } else {
        if (!formState.yearsOfExperience.trim()) errors.yearsOfExperience = 'יש להזין שנות ניסיון.';
        if (!formState.expertiseAreas.trim()) errors.expertiseAreas = 'יש להזין תחומי מומחיות.';
      }
    }
  }

  if (step === 2) {
    if (formState.teachingLevels.length === 0) errors.teachingLevels = 'יש לבחור לפחות רמת הוראה אחת.';
    if (formState.selectedSubjects.length === 0) errors.selectedSubjects = 'יש לבחור לפחות מקצוע אחד.';
  }

  if (step === 3) {
    if (formState.weeklyTimeBlocks.length === 0) errors.weeklyTimeBlocks = 'יש לבחור לפחות חלון זמינות אחד.';
  }

  if (step === 4) {
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
  }

  if (step === 6) {
    if (!formState.legalTax || !formState.legalContractor || !formState.legalMinors || !formState.legalCommunity) {
      errors.legal = 'יש לאשר את כל ארבע ההצהרות להמשך.';
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

function validateTeacherOnboardingAll(formState: TeacherOnboardingData): { isValid: boolean; errorsByStep: Record<number, StepValidationErrors>; firstInvalidStep: number | null } {
  const errorsByStep: Record<number, StepValidationErrors> = {};
  let firstInvalidStep: number | null = null;

  for (const step of [1, 2, 3, 4, 5, 6]) {
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

  return { message: 'לא ניתן להשלים את הפעלת הפרופיל כרגע. בדקו את הפרטים ונסו שוב.', step: 7, errors: {} };
}

function translateAuthGateError(error: string): string {
  const lower = error.toLowerCase();
  if (lower.includes('invalid') && lower.includes('email')) return 'יש להזין כתובת אימייל תקינה.';
  if (lower.includes('password')) return 'הסיסמה חייבת להכיל לפחות 8 תווים.';
  if (lower.includes('invalid login') || lower.includes('credentials')) return 'האימייל או הסיסמה אינם נכונים.';
  if (lower.includes('already') || lower.includes('registered')) return 'כבר קיים חשבון עם כתובת האימייל הזו.';
  return 'לא ניתן להתחבר כרגע. בדקו את הפרטים ונסו שוב.';
}

// Adapts the backend BusySlot shape ({ startAt, endAt }) to the shared
// busy-slot → grid-block mapper. Produces hyphen keys like "ראשון-morning"
// consumed by TeacherAvailabilityCalendar. The mapping logic (Asia/Jerusalem
// hour-by-hour walk, DST-safe) lives in utils/mapBusySlotsToBlockKeys.ts and is
// shared with the student availability flow.
function mapBusySlotsToBlockKeys(busySlots: BusySlot[]): string[] {
  return mapBusySlotsToBlockKeysShared(
    busySlots.map((slot) => ({ start: slot.startAt, end: slot.endAt })),
  );
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
  const { status, user, profile, session, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<TeacherOnboardingData>(INITIAL_DATA);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle');
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [nextRoute, setNextRoute] = useState('/dashboard');
  // Initial draft fetch state — shown while the first GET /api/teachers/me/onboarding
  // is in-flight. After the fetch resolves (success or null draft) this becomes false.
  const [draftLoading, setDraftLoading] = useState(true);
  const [draftError, setDraftError] = useState<string | null>(null);
  // Bumped by the draft-error "retry" button to force the fetch effect to re-run
  // even when the session token hasn't changed (otherwise retry hangs the spinner).
  const [draftRetryNonce, setDraftRetryNonce] = useState(0);
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

  // If a teacher who already finished onboarding lands here (e.g. via back-button or
  // a stale bookmark), send them to their dashboard immediately.
  useEffect(() => {
    if (user?.role === 'teacher' && profile?.onboardingCompleted === true) {
      navigate('/teacher/dashboard', { replace: true });
    }
  }, [user, profile, navigate]);

  // ── Auth gate (shown between step 3 and step 4 for guests) ─────────────────
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [authGateError, setAuthGateError] = useState<string | null>(null);
  const [authGateLoading, setAuthGateLoading] = useState(false);
  // Tracks whether a Google OAuth return is pending post-auth sync.
  const pendingPostAuthType = useRef<'oauth' | null>(null);
  const TEACHER_OAUTH_PENDING_KEY = 'sb_teacher_onboarding_oauth_pending';
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

  // ── Google-first: unauthenticated teachers must sign in before any step ────
  // The Google sign-in screen (auth gate) is the FIRST thing a guest sees, just
  // like the student wizard. Once authenticated, the post-auth effect clears it.
  useEffect(() => {
    if (status === 'unauthenticated') {
      setShowAuthGate(true);
    } else if (status === 'authenticated') {
      setShowAuthGate(false);
    }
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

  // ── Post-auth sync: fires after Google OAuth return ─────────────────────────
  // Detects the TEACHER_OAUTH_PENDING_KEY flag set before the OAuth redirect.
  // Once status becomes 'authenticated' and the session token is available,
  // this effect completes the OAuth signup, pushes/pulls the draft, then advances.
  useEffect(() => {
    // Wait only for the initial session resolution. A brand-new Google user is
    // 'unauthenticated' here (their /me 403'd because they have no role/local
    // user yet) but DOES have a valid Supabase session token — that's exactly
    // who needs to complete-oauth-signup. Returning teachers arrive as
    // 'authenticated'. Both must run this; only 'loading' should wait.
    if (status === 'loading') return;
    const token = session?.access_token;
    if (!token) return;

    // Check for OAuth return flag
    const oauthPending = localStorage.getItem(TEACHER_OAUTH_PENDING_KEY);
    if (!oauthPending && pendingPostAuthType.current === null) return;

    // Consume the flag
    localStorage.removeItem(TEACHER_OAUTH_PENDING_KEY);
    if (pendingPostAuthType.current !== null) pendingPostAuthType.current = null;

    // Complete the OAuth signup (assigns teacher role + creates local user row)
    void (async () => {
      setAuthGateLoading(true);
      try {
        const { completeTeacherOAuthSignup } = await import('../api/teacherOnboarding');
        const oauthResult = await completeTeacherOAuthSignup(
          data.fullName || user?.full_name || 'מורה',
          token,
        );
        // A returning teacher (role already 'teacher') passes cleanly. Any error
        // here means the connected Google account belongs to a different role
        // (student/parent/admin) or the assignment failed — block and explain.
        if ('error' in oauthResult) {
          setAuthGateError(
            oauthResult.error.includes('לא מתאים')
              ? 'החשבון המחובר אינו חשבון מורה. התחבר/י עם חשבון Google אחר.'
              : translateAuthGateError(oauthResult.error),
          );
          setAuthGateLoading(false);
          return;
        }

        // Provisioning succeeded (role assigned + local user row created). Re-run
        // /api/auth/me so AuthProvider flips this fresh user from the
        // unprovisioned 'unauthenticated' state to 'authenticated' — otherwise
        // they'd stay gated even though they now have a role.
        await refreshProfile();

        // Try to fetch an existing backend draft (returning user)
        const draftResponse = await fetchOnboardingDraft(token);
        try { localStorage.removeItem('sb_teacher_guest_draft'); } catch {}

        if (!('error' in draftResponse) && draftResponse.data.onboarding) {
          const hydrated = hydrateFromRemote(draftResponse.data.onboarding, INITIAL_DATA);
          setData((prev) => ({ ...prev, ...hydrated }));
          const savedStep = draftResponse.data.onboarding.onboardingStep ?? 1;
          setStep(savedStep >= 1 && savedStep <= 7 ? savedStep : 1);
        } else {
          // New teacher — prefill the name from the Google profile, then start
          // the questions from the first step.
          setData((prev) => ({ ...prev, fullName: prev.fullName || user?.full_name || '' }));
          saveOnboardingDraft(data, step, token).catch(() => {});
          setStep(1);
        }
        setShowAuthGate(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        setAuthGateError('שגיאה בעיבוד החשבון. נסו שנית.');
      } finally {
        setAuthGateLoading(false);
      }
    })();
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
          setDraftError('לא ניתן לטעון את הטיוטה כרגע. בדקו את החיבור ונסו שוב.');
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
        // Network-level failure — the retry button (draftRetryNonce) can re-run this.
        hasFetchedDraftRef.current = false;
        setDraftError('לא ניתן לטעון את הטיוטה כרגע. בדקו את החיבור ונסו שוב.');
        setDraftLoading(false);
      });
  }, [session?.access_token, draftRetryNonce]);

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
    if (step !== 3) return; // Availability screen (v2 screen 4)
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

    // Account Connection is the entry auth-gate (handled by the unauthenticated
    // effect), so all content steps here are already authenticated.
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
    setStep(8); // v2: Processing state (content steps are 1–7)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Auth gate: initiate Google OAuth, persist draft to localStorage first.
  async function handleAuthGateGoogleOAuth() {
    if (authGateLoading) return;
    setAuthGateError(null);

    // Persist the in-progress draft so we can resume after OAuth redirect
    try {
      localStorage.setItem('sb_teacher_guest_draft', JSON.stringify({ data, step }));
    } catch { /* ignore */ }
    localStorage.setItem(TEACHER_OAUTH_PENDING_KEY, 'true');

    const { getSupabaseBrowserClient } = await import('../auth/supabaseClient');
    const supabase = getSupabaseBrowserClient();
    // Request the full calendar scope up-front so the availability grid can
    // auto-block the teacher's busy slots (read) and create Meet links later
    // (write) — without a separate "connect calendar" round-trip.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/calendar',
        queryParams: { access_type: 'offline', prompt: 'consent' },
        redirectTo: `${window.location.origin}/teacher-onboarding`,
      },
    });
    if (error) {
      localStorage.removeItem(TEACHER_OAUTH_PENDING_KEY);
      setAuthGateError('לא ניתן להתחבר עם Google כרגע. נסו שוב.');
    }
  }

  // Processing state (v2 step 8): run loading animation + call complete API.
  useEffect(() => {
    if (step !== 8) return;

    const interval = setInterval(() => setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 850);
    const snapshot = completionSnapshotRef.current;

    if (!snapshot) {
      // No auth token — fall back to timed mock (UI-only mode)
      const timer = setTimeout(() => { clearInterval(interval); setStep(9); }, 3600);
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
          if (mapped.step !== 7) {
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
          setStep(9); // v2: Success state
        }
      })
      .catch(() => {
        if (cancelled) return;
        clearInterval(interval);
        setCompletionError('אירעה שגיאה בהפעלת הפרופיל. אנא נסה שוב.');
        isActivatingRef.current = false;
        setStep(7); // back to Preview
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
            מכינים את פרופיל המורה שלך... (Preparing your teacher profile...)
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
        <FlowNav to="/teachers" label="חזרה לעמוד המורים" />
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
              // Force the fetch effect to re-run even if the token is unchanged.
              setDraftRetryNonce((n) => n + 1);
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

  // ═══════════════════════════════════════════════════════════════════════════
  // v2 redesigned render — 8 screens. Account Connection is the auth-gate overlay
  // (screen 1); content steps 1–7 map to screens 2–8; step 8 = Processing,
  // step 9 = Success. This block always returns, so the legacy render below is
  // unreachable (kept temporarily; scheduled for cleanup).
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const screenNum = showAuthGate ? 1 : Math.min(step + 1, TOTAL_SCREENS_V2);
    const errs = stepErrors[step] ?? {};

    const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => update({ profileImagePreview: ev.target?.result as string });
      reader.readAsDataURL(file);
    };

    // Academic-path inputs reuse the wired AcademicRepositoryAutocomplete.
    const academicSlot = (
      <div style={{ display: 'grid', gap: 16 }}>
        <AcademicRepositoryAutocomplete
          label="מוסד לימודים"
          placeholder="חיפוש מוסד בעברית או באנגלית..."
          items={academicInstitutions}
          selectedName={data.academicInstitutionName}
          selectedCategory={data.academicInstitutionCategory}
          pendingName={data.academicInstitutionRequestName}
          error={errs.institution}
          requestError={repositoryRequestErrors.institution}
          requestDisabled={!session?.access_token}
          onSelect={(item) => update({ institution: '', academicInstitutionId: item.id, academicInstitutionName: item.name, academicInstitutionCategory: item.category, academicInstitutionRequestId: null, academicInstitutionRequestName: '' })}
          onRequestAdd={(name) => requestAcademicRepositoryValue('institution', name)}
        />
        <AcademicRepositoryAutocomplete
          label="תחום לימוד / תואר"
          placeholder="חיפוש תחום לימוד בעברית או באנגלית..."
          items={academicFields}
          selectedName={data.academicFieldName}
          selectedCategory={data.academicFieldCategory}
          pendingName={data.academicFieldRequestName}
          error={errs.degree}
          requestError={repositoryRequestErrors.field}
          requestDisabled={!session?.access_token}
          onSelect={(item) => update({ degree: '', academicFieldId: item.id, academicFieldName: item.name, academicFieldCategory: item.category, academicFieldRequestId: null, academicFieldRequestName: '' })}
          onRequestAdd={(name) => requestAcademicRepositoryValue('field', name)}
        />
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: TOW.text3, fontFamily: TOW.fontMono, marginBottom: 8 }}>שנת לימוד (Academic Year)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ACADEMIC_YEAR_OPTIONS.map((yr) => (
              <TowChipSelect key={yr} small label={yr} selected={data.academicYear === yr} onClick={() => update({ academicYear: yr })} />
            ))}
          </div>
          {errs.academicYear && <div style={{ color: TOW.alert, fontSize: 13, fontWeight: 600, marginTop: 6 }}>{errs.academicYear}</div>}
        </div>
      </div>
    );

    // ── Screen 1: Account Connection (auth-gate overlay) ────────────────────
    if (showAuthGate) {
      return (
        <WizardShell>
          <NeonProgressTracker step={1} total={TOTAL_SCREENS_V2} progressPct={STEP_PROGRESS_V2[1] ?? 0} />
          <Screen1AccountConnection
            onGoogle={() => { void handleAuthGateGoogleOAuth(); }}
            onBack={() => navigate('/teachers')}
            loading={authGateLoading}
            error={authGateError}
          />
        </WizardShell>
      );
    }

    // ── Processing state (step 8) ───────────────────────────────────────────
    if (step === 8) {
      return (
        <WizardShell>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '32px 8px' }}>
            <Loader2 size={40} className="animate-spin" style={{ color: TOW.neon }} />
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: TOW.text }}>מפעילים את סביבת ההוראה שלך</h2>
            <div key={loadingMsgIdx} className="tow-glitch" style={{ fontFamily: TOW.fontMono, fontSize: 14, color: TOW.text2, minHeight: 22 }}>
              {LOADING_MESSAGES[loadingMsgIdx]}
            </div>
            <div style={{ width: '100%', maxWidth: 360, display: 'grid', gap: 8 }}>
              {LOADING_MESSAGES.map((msg, i) => (
                <div key={msg} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: i <= loadingMsgIdx ? TOW.text : TOW.text3 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: i <= loadingMsgIdx ? TOW.success : TOW.line2 }} />
                  {msg}
                </div>
              ))}
            </div>
          </div>
        </WizardShell>
      );
    }

    // ── Success state (step 9) ──────────────────────────────────────────────
    if (step === 9) {
      return (
        <WizardShell>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '28px 8px', textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 72, height: 72, borderRadius: 18, background: `color-mix(in oklab, ${TOW.success} 18%, transparent)`, border: `2px solid ${TOW.success}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={36} style={{ color: TOW.success }} />
            </div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: TOW.text }}>סביבת ההוראה שלך מוכנה</h2>
            <p style={{ margin: 0, fontSize: 14, color: TOW.text2, maxWidth: 360, lineHeight: 1.6 }}>
              ברוך/ה הבא/ה{data.fullName ? `, ${data.fullName}` : ''}. מנוע ההתאמות כבר עובד בשבילך.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, width: '100%', maxWidth: 360, margin: '6px 0' }}>
              {[
                { label: 'מקצועות', value: data.selectedSubjects.length || '—' },
                { label: 'תלמידים', value: data.maxActiveStudents ?? '—' },
                { label: 'תעריף', value: data.hourlyRate ? `₪${data.hourlyRate}` : '—' },
              ].map((stat) => (
                <div key={stat.label} style={{ background: TOW.card, border: `1.5px solid ${TOW.line2}`, borderRadius: TOW.radiusSm, padding: '12px 8px' }}>
                  <div style={{ fontFamily: TOW.fontMono, fontSize: 18, fontWeight: 800, color: TOW.neon }}>{stat.value}</div>
                  <div style={{ fontSize: 11, color: TOW.text3, marginTop: 2 }}>{stat.label}</div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate(nextRoute)}
              className="tow-pulse-cta"
              style={{ width: '100%', maxWidth: 360, padding: '15px 20px', borderRadius: TOW.radiusSm, border: 'none', background: TOW.orange, color: '#1a0e05', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--tow-font)' }}
            >
              מעבר לדשבורד (Go to Dashboard)
            </button>
          </div>
        </WizardShell>
      );
    }

    // ── Content screens 1–7 (Experience … Preview) ──────────────────────────
    return (
      <>
        <SaveIndicator status={draftStatus} />
        <WizardShell wide={step === 3 || step === 4}>
          <NeonProgressTracker step={screenNum} total={TOTAL_SCREENS_V2} progressPct={STEP_PROGRESS_V2[screenNum] ?? 0} />
          {step === 1 && (
            <Screen2Experience data={data} update={update} errors={errs} onPickImage={() => fileInputRef.current?.click()} academicSlot={academicSlot} />
          )}
          {step === 2 && <Screen3SubjectsStyle data={data} update={update} errors={errs} />}
          {step === 3 && (
            <Screen4Availability
              error={errs.weeklyTimeBlocks}
              removedNotice={removedBlocksNotice}
              syncCard={
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
              }
              grid={<TeacherAvailabilityCalendar selectedBlocks={data.weeklyTimeBlocks} busyBlocks={busyBlocks} onChange={updateTimeBlocks} />}
            />
          )}
          {step === 4 && <Screen5Operations data={data} update={update} errors={errs} />}
          {step === 5 && <Screen6Pricing data={data} update={update} errors={errs} />}
          {step === 6 && <Screen7Verifications data={data} update={update} errors={errs} />}
          {step === 7 && <Screen8Preview data={data} onActivate={activateProfile} completionError={completionError} />}
          {step !== 7 && (
            <TowNavButtons
              onBack={step === 1 ? undefined : back}
              onNext={next}
              hideBack={step === 1}
              nextLabel={step === 6 ? 'לתצוגה מקדימה' : 'המשך'}
              nextEnglish={step === 6 ? 'Preview' : 'Continue'}
            />
          )}
        </WizardShell>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onImageChange} />
      </>
    );
  }

}
