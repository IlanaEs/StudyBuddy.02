import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, GraduationCap, Briefcase, Award, BookOpen,
  Calendar, Clock, Users, Zap, Check, ChevronLeft, Shield,
  ShieldCheck, DollarSign, FileText, ToggleLeft, ToggleRight,
  Loader2, CheckCircle2, ArrowRight, BarChart2,
  CalendarCheck, CalendarX, RefreshCw, Link2Off,
} from 'lucide-react';
import { TeacherAvailabilityCalendar, makeBlockKey, AVAIL_DAYS } from '../components/onboarding/TeacherAvailabilityCalendar';
import type { TimeBlockId } from '../components/onboarding/TeacherAvailabilityCalendar';
import type { GCalStatus, BusySlot } from '../api/teacherCalendar';
import {
  initiateCalendarConnect,
  syncCalendar,
  fetchCalendarStatus,
  fetchBusySlots,
  disconnectCalendar as disconnectCalendarApi,
} from '../api/teacherCalendar';
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
  SB_ORANGE,
  SB_ORANGE_SOFT,
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

function mapBusySlotsToBlockKeys(busySlots: BusySlot[]): string[] {
  const blockKeys = new Set<string>();
  const hebrewDays: Record<number, typeof AVAIL_DAYS[number]> = {
    0: 'ראשון', 1: 'שני', 2: 'שלישי', 3: 'רביעי', 4: 'חמישי', 5: 'שישי', 6: 'שבת',
  };
  const timeBlocks: Array<{ id: TimeBlockId; startH: number; endH: number }> = [
    { id: 'morning', startH: 8, endH: 13 },
    { id: 'afternoon', startH: 13, endH: 18 },
    { id: 'evening', startH: 18, endH: 22 },
  ];
  for (const slot of busySlots) {
    const slotStart = new Date(slot.startAt);
    const slotEnd = new Date(slot.endAt);
    const cursor = new Date(slotStart);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= slotEnd) {
      const hebrewDay = hebrewDays[cursor.getDay()];
      if (hebrewDay) {
        for (const block of timeBlocks) {
          const blockStart = new Date(cursor);
          blockStart.setHours(block.startH, 0, 0, 0);
          const blockEnd = new Date(cursor);
          blockEnd.setHours(block.endH, 0, 0, 0);
          if (slotStart < blockEnd && slotEnd > blockStart) {
            blockKeys.add(`${hebrewDay}-${block.id}`);
          }
        }
      }
      cursor.setDate(cursor.getDate() + 1);
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
          border: '2px solid var(--line-2)',
          overflow: 'clip',
          boxShadow: '5px 5px 0 rgba(0,0,0,0.4), 0 24px 60px -32px rgba(0,0,0,0.7)',
        }}
      >
        {/* Orange top stripe — visual anchor */}
        <div
          style={{
            height: 4,
            background: `linear-gradient(90deg, ${SB_ORANGE} 0%, #fb923c 50%, rgba(249,115,22,0.4) 100%)`,
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
}: {
  status: GCalStatus;
  lastSynced?: string | null;
  busyCount?: number;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const borderByStatus: Record<GCalStatus, string> = {
    not_connected: 'var(--line-2)',
    connecting: 'color-mix(in oklab, var(--gold) 35%, transparent)',
    connected: 'color-mix(in oklab, var(--lime) 35%, transparent)',
    sync_failed: 'color-mix(in oklab, var(--coral) 35%, transparent)',
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

      {status === 'connected' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CalendarCheck size={20} style={{ color: 'var(--lime)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              Google Calendar מחובר
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
              {lastSynced ? `סונכרן ${new Date(lastSynced).toLocaleDateString('he-IL')} · ${busyCount} שעות חסומות` : 'מחובר'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
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
              הרשאה נדחתה או פג תוקף — נסה שוב
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
              border: '1px solid var(--line-2)',
              background: 'transparent',
              color: 'var(--text-2)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <RefreshCw size={11} />
            נסה שוב
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
  const { session } = useAuth();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<TeacherOnboardingData>(INITIAL_DATA);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle');
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [nextRoute, setNextRoute] = useState('/dashboard');
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

  const [gcalStatus, setGcalStatus] = useState<GCalStatus>('not_connected');
  const [busyBlocks, setBusyBlocks] = useState<string[]>([]);
  const [gcalLastSynced, setGcalLastSynced] = useState<string | null>(null);
  const [gcalBusyCount, setGcalBusyCount] = useState(0);
  const [removedBlocksNotice, setRemovedBlocksNotice] = useState(false);

  function update(patch: Partial<TeacherOnboardingData>) {
    hasUserEditedRef.current = true;
    setData((prev) => ({ ...prev, ...patch }));
  }

  // Load existing draft once per page load. Depends on session token so it
  // fires after AuthProvider resolves even if that happens post-mount.
  useEffect(() => {
    const token = session?.access_token;
    if (!token || hasFetchedDraftRef.current) return;
    hasFetchedDraftRef.current = true;

    fetchOnboardingDraft(token)
      .then((response) => {
        if ('error' in response) {
          // Network or auth error — allow retry when token rotates.
          // This is the only case that resets the flag; a null draft is a
          // legitimate "no record yet" response and must NOT loop forever.
          hasFetchedDraftRef.current = false;
          return;
        }

        // Consume the OAuth return step key regardless of whether a draft
        // exists. This prevents it from being re-read on later re-renders.
        const returnStepRaw = sessionStorage.getItem('sb_gcal_return_step');
        const returnStep = returnStepRaw ? parseInt(returnStepRaw, 10) : 1;
        if (returnStepRaw) sessionStorage.removeItem('sb_gcal_return_step');

        if (!response.data.onboarding) {
          // No draft saved yet — still honour the OAuth return step so the
          // user lands back on the calendar screen after approving GCal.
          if (returnStep > 1 && returnStep <= 6) setStep(returnStep);
          return;
        }

        // Don't overwrite changes the user made while the fetch was in-flight
        if (hasUserEditedRef.current) return;
        const hydrated = hydrateFromRemote(response.data.onboarding, INITIAL_DATA);
        setData((prev) => ({ ...prev, ...hydrated }));
        const savedStep = response.data.onboarding.onboardingStep;
        const targetStep = Math.max(savedStep, returnStep);
        if (targetStep > 1 && targetStep <= 6) setStep(targetStep);
      })
      .catch(() => {
        // Network-level failure — allow retry when token rotates
        hasFetchedDraftRef.current = false;
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

    if (import.meta.env.DEV) {
      console.debug('[GCalEffect] fired', {
        step,
        hasAccessToken: !!accessToken,
        hasProviderToken: !!providerToken,
        providerTokenSource: sessionProviderToken ? 'session' : earlyToken ? 'early-capture' : 'none',
        providerTokenLength: providerToken?.length ?? 0,
        wasConnecting,
      });
    }

    if (wasConnecting) sessionStorage.removeItem('sb_gcal_connecting');

    if (providerToken) {
      // Returned from OAuth with a live Google token — sync immediately
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
        .catch((err: unknown) => {
          if (import.meta.env.DEV) {
            console.error('[GCalEffect] syncCalendar failed', err instanceof Error ? err.message : err);
          }
          setGcalStatus('sync_failed');
        });
    } else if (wasConnecting) {
      // OAuth was attempted but no provider_token → denied or error
      if (import.meta.env.DEV) {
        console.debug('[GCalEffect] wasConnecting but no provider_token — marking sync_failed');
      }
      setGcalStatus('sync_failed');
    } else {
      // Normal load — check cached status from backend
      fetchCalendarStatus(accessToken)
        .then(status => {
          if (status !== 'connected') return;
          setGcalStatus('connected');
          fetchBusySlots(accessToken)
            .then(slots => {
              const blocks = mapBusySlotsToBlockKeys(slots);
              setBusyBlocks(blocks);
              setGcalBusyCount(blocks.length);
            })
            .catch(() => {/* non-fatal */});
        })
        .catch(() => {/* non-fatal */});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, session?.access_token, session?.provider_token]);

  function next() {
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

  async function handleGCalConnect() {
    const token = session?.access_token;
    setGcalStatus('connecting');
    try {
      // Flush current form state to the DB before the OAuth redirect so it
      // can be restored when the browser returns to this page. We await here
      // so the write completes before navigation leaves the page.
      if (token) {
        await saveOnboardingDraft(data, step, token);
      }
      sessionStorage.setItem('sb_gcal_connecting', '1');
      sessionStorage.setItem('sb_gcal_return_step', String(step));
      await initiateCalendarConnect();
      // initiateCalendarConnect() causes a full-page redirect — nothing below runs.
    } catch {
      sessionStorage.removeItem('sb_gcal_connecting');
      sessionStorage.removeItem('sb_gcal_return_step');
      setGcalStatus('sync_failed');
    }
  }

  function handleGCalDisconnect() {
    const accessToken = session?.access_token;
    setGcalStatus('not_connected');
    setBusyBlocks([]);
    setGcalBusyCount(0);
    setGcalLastSynced(null);
    setRemovedBlocksNotice(false);
    update({ availabilityMode: 'manual' });
    if (accessToken) {
      disconnectCalendarApi(accessToken).catch(() => {/* non-fatal */});
    }
  }

  // Enter loading screen: capture snapshot then go to step 7.
  // isActivatingRef prevents double-submission from rapid clicks.
  function activateProfile() {
    if (isActivatingRef.current) return;
    isActivatingRef.current = true;
    setCompletionError(null);
    const token = session?.access_token;
    if (token) {
      completionSnapshotRef.current = { data, token };
    }
    setStep(7);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      .then(([, response]) => {
        if (cancelled) return;
        clearInterval(interval);
        if ('error' in response) {
          setCompletionError(response.error);
          isActivatingRef.current = false;
          setStep(6);
        } else {
          setNextRoute(response.data.nextRoute);
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

  // ── STEP 1: Identity ─────────────────────────────────────────────────────────
  if (step === 1) {
    const canContinue = data.fullName.trim().length > 1 && data.professionalStatus !== null;

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

        <NavButtons hideBack onNext={next} nextDisabled={!canContinue} />
      </OnboardingShell>
      </>
    );
  }

  // ── STEP 2: Background ───────────────────────────────────────────────────────
  if (step === 2) {
    const academic = isAcademicPath(data.professionalStatus);

    return (
      <OnboardingShell>
        <TeacherOnboardingProgress step={2} totalContentSteps={6} progressPct={STEP_PROGRESS[2]} />
        <StepHeader
          title={academic ? 'רקע אקדמי' : 'ניסיון ומומחיות'}
          subtitle={academic ? 'מוסד, תחום לימוד ושנה — נבנה ממנו את כרטיס הפרופיל שלך.' : 'הניסיון שלך בשטח הוא הכרטיס הביקור שלך.'}
        />

        {academic ? (
          <div style={{ display: 'grid', gap: 18 }}>
            <div>
              <SectionLabel>מוסד לימודים</SectionLabel>
              <input
                type="text"
                placeholder='לדוגמה: אוניברסיטת תל אביב, הטכניון...'
                value={data.institution}
                onChange={(e) => update({ institution: e.target.value })}
                className="ob-input"
                style={inputStyle}
              />
            </div>
            <div>
              <SectionLabel>תחום לימוד / תואר</SectionLabel>
              <input
                type="text"
                placeholder='לדוגמה: תואר ראשון במתמטיקה, מדעי המחשב...'
                value={data.degree}
                onChange={(e) => update({ degree: e.target.value })}
                className="ob-input"
                style={inputStyle}
              />
            </div>
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
          </div>
        )}

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

        <NavButtons onBack={back} onNext={next} nextDisabled={data.teachingLevels.length === 0} />
      </OnboardingShell>
    );
  }

  // ── STEP 4: Teaching Operations Engine ───────────────────────────────────────
  if (step === 4) {
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
            </div>
            <div style={{ marginBottom: 12 }}>
              <SectionLabel>שעות שבועיות (מקסימום)</SectionLabel>
              <NumberChipRow
                options={WEEKLY_HOURS_OPTIONS}
                selected={data.weeklyTeachingHours}
                onSelect={(v) => update({ weeklyTeachingHours: v })}
                suffix=" ש׳"
              />
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
            {data.commitmentTypes.includes('exam_marathons') && (
              <div style={{ marginTop: 14 }}>
                <SectionLabel>מספר שיעורים למרתון</SectionLabel>
                <NumberChipRow
                  options={MARATHON_SESSION_OPTIONS}
                  selected={data.marathonSessionCount}
                  onSelect={(v) => update({ marathonSessionCount: v })}
                  suffix=" שיעורים"
                />
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
            </>
          )}
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

        <NavButtons
          onBack={back}
          onNext={next}
          nextDisabled={!allRequiredChecked}
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
  // TODO: replace navigate('/dashboard') with the teacher-specific dashboard route once it exists
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
