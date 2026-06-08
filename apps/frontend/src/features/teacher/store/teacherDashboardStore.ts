import { create } from 'zustand';
import type {
  DashboardLesson,
  DashboardRequest,
  DashboardStudent,
  LedgerEntry,
  Material,
  Task,
  TaskStatus,
  TeacherConfig,
  SubscriptionInfo,
  DashboardTab,
  DashboardStatus,
  AvailabilitySlot,
  CalendarSlice,
  CalendarSyncState,
} from '../types/teacherDashboard.types';
import type { BusySlot } from '../../../api/teacherCalendar';
import { AUTO_CLOSE_HOURS } from '../utils/ledger';

const nowISO = () => new Date().toISOString();

// Cycle order for the teacher-driven task status (proxy for the student "done" event).
const NEXT_TASK_STATUS: Record<TaskStatus, TaskStatus> = {
  assigned: 'in_progress',
  in_progress: 'completed',
  completed: 'assigned',
};

/**
 * Re-derive a ledger entry's teacher side after a checkbox toggle: anchor the
 * 48h timer the moment Done+Paid both become true (clear it if un-done), and
 * close immediately when the student has already confirmed (dual approval).
 */
function withTeacherSide(e: LedgerEntry, teacherDone: boolean, teacherPaid: boolean): LedgerEntry {
  const both = teacherDone && teacherPaid;
  const teacherCompletedAt = both ? (e.teacherCompletedAt ?? nowISO()) : null;
  const closedAt = both && e.studentConfirmedAt ? (e.closedAt ?? nowISO()) : e.closedAt;
  return { ...e, teacherDone, teacherPaid, teacherCompletedAt, closedAt };
}

// Only the active tab is persisted; entity data is owned by the backend (later tasks).
const STORAGE_KEY = 'sb_teacher_dashboard';
// Teacher's private per-student brief notes — persisted via a localStorage proxy
// (graceful stand-in for the backend, same approach as the other placeholders).
const NOTES_STORAGE_KEY = 'sb_teacher_student_notes';

interface TeacherDashboardStore {
  // ── State (single source of truth read by every tab) ──────────────────────
  config: TeacherConfig | null;
  lessons: DashboardLesson[];
  requests: DashboardRequest[];
  availabilitySlots: AvailabilitySlot[];
  calendar: CalendarSlice;
  students: DashboardStudent[];
  ledgerEntries: LedgerEntry[];
  materials: Material[];
  tasks: Task[];
  studentNotes: Record<string, string>; // studentId → brief text
  subscription: SubscriptionInfo | null;
  activeTab: DashboardTab;
  status: DashboardStatus;
  error: string | null;

  // ── Actions ───────────────────────────────────────────────────────────────
  setActiveTab: (tab: DashboardTab) => void;
  setStatus: (status: DashboardStatus, error?: string | null) => void;
  setConfig: (config: TeacherConfig) => void;
  /** Merge a partial patch into config (Settings edits). No-op if config is null. */
  updateConfig: (patch: Partial<TeacherConfig>) => void;
  setLessons: (lessons: DashboardLesson[]) => void;
  setRequests: (requests: DashboardRequest[]) => void;
  setAvailability: (slots: AvailabilitySlot[]) => void;
  // ── Google Calendar (best-effort overlay) ──────────────────────────────────
  setCalendarStatus: (status: 'connected' | 'not_connected', lastSyncedAt: string | null) => void;
  setBusySlots: (busySlots: BusySlot[]) => void;
  setCalendarSyncState: (syncState: CalendarSyncState) => void;
  setStudents: (students: DashboardStudent[]) => void;
  setLedgerEntries: (entries: LedgerEntry[]) => void;
  setMaterials: (materials: Material[]) => void;
  setTasks: (tasks: Task[]) => void;
  /**
   * Cross-tab source of truth: accepting a request marks it approved, adds the
   * (backend-created) lesson, and records a ledger entry — from a single write,
   * so the Calendar, the Overview weekly tile, and the Finance tab all reflect
   * it. The lesson is passed in by the caller (mapped from the respond API).
   */
  acceptRequest: (requestId: string, lesson: DashboardLesson) => void;
  /** Declining a request marks it rejected (no lesson/ledger side effects). */
  declineRequest: (requestId: string) => void;
  // ── Finance / ledger workflow (T3) — no-ops on a locked (closed) row ───────
  /** Toggle בוצע (Done); anchors the 48h timer once Done+Paid are both set. */
  toggleLedgerDone: (entryId: string) => void;
  /** Toggle שולם (Paid); anchors the 48h timer once Done+Paid are both set. */
  toggleLedgerPaid: (entryId: string) => void;
  /** Proxy for the student's cross-app confirmation — the second dual-approval party. */
  confirmStudentReceipt: (entryId: string) => void;
  /** Proxy for the 48h backend sweep: close any pending-student row past the window. */
  evaluateLedgerAutoClose: (now?: string) => void;
  // ── Students CRM (T4) ──────────────────────────────────────────────────────
  /** Cycle a homework task assigned→in_progress→completed→assigned (teacher proxy). */
  cycleTaskStatus: (taskId: string) => void;
  /** Save the teacher's brief for a student; persists via the localStorage proxy. */
  setStudentNote: (studentId: string, text: string) => void;
  // ── Settings (T5) ──────────────────────────────────────────────────────────
  /** Kill Switch: write the freeze state; canAcceptStudents() reads it as the single gate. */
  setFrozen: (frozen: boolean) => void;
  /** Set the subscription/billing display proxy. */
  setSubscription: (subscription: SubscriptionInfo | null) => void;
  reset: () => void;
}

function readStudentNotes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeStudentNotes(notes: Record<string, string>) {
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // Ignore storage errors (private browsing, quota).
  }
}

function readActiveTab(): DashboardTab {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 'overview';
    const parsed = JSON.parse(raw) as { activeTab?: DashboardTab };
    return parsed.activeTab ?? 'overview';
  } catch {
    return 'overview';
  }
}

function writeActiveTab(activeTab: DashboardTab) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab }));
  } catch {
    // Ignore storage errors (private browsing, quota).
  }
}

export const useTeacherDashboardStore = create<TeacherDashboardStore>((set, get) => ({
  config: null,
  lessons: [],
  requests: [],
  availabilitySlots: [],
  calendar: { status: 'not_connected', lastSyncedAt: null, busySlots: [], syncState: 'idle' },
  students: [],
  ledgerEntries: [],
  materials: [],
  tasks: [],
  studentNotes: readStudentNotes(),
  subscription: null,
  activeTab: readActiveTab(),
  status: 'idle',
  error: null,

  setActiveTab: (tab) => {
    writeActiveTab(tab);
    set({ activeTab: tab });
  },
  setStatus: (status, error = null) => set({ status, error }),
  setConfig: (config) => set({ config }),
  updateConfig: (patch) =>
    set((s) => (s.config ? { config: { ...s.config, ...patch } } : {})),
  setLessons: (lessons) => set({ lessons }),
  setRequests: (requests) => set({ requests }),
  setAvailability: (availabilitySlots) => set({ availabilitySlots }),
  setCalendarStatus: (status, lastSyncedAt) =>
    set((s) => ({ calendar: { ...s.calendar, status, lastSyncedAt } })),
  setBusySlots: (busySlots) => set((s) => ({ calendar: { ...s.calendar, busySlots } })),
  setCalendarSyncState: (syncState) => set((s) => ({ calendar: { ...s.calendar, syncState } })),
  setStudents: (students) => set({ students }),
  setLedgerEntries: (ledgerEntries) => set({ ledgerEntries }),
  setMaterials: (materials) => set({ materials }),
  setTasks: (tasks) => set({ tasks }),

  acceptRequest: (requestId, lesson) => {
    const { requests, lessons, ledgerEntries, config } = get();
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    const entry: LedgerEntry = {
      id: `ledger-${lesson.id}`,
      type: 'lesson_earned',
      lessonId: lesson.id,
      amount: lesson.amount ?? config?.hourlyRate ?? 0,
      description: lesson.subjectName ?? request.subjectName,
      createdAt: lesson.startsAt,
      studentId: lesson.studentId || request.studentId || null,
      studentName: lesson.studentName ?? request.studentName,
      subjectName: lesson.subjectName ?? request.subjectName,
      teacherDone: false,
      teacherPaid: false,
      teacherCompletedAt: null,
      studentConfirmedAt: null,
      closedAt: null,
    };

    set({
      requests: requests.map((r) => (r.id === requestId ? { ...r, status: 'approved' } : r)),
      // Dedupe by id so a later lessons refetch can't double-insert.
      lessons: lessons.some((l) => l.id === lesson.id) ? lessons : [...lessons, lesson],
      ledgerEntries: ledgerEntries.some((e) => e.id === entry.id) ? ledgerEntries : [...ledgerEntries, entry],
    });
  },

  declineRequest: (requestId) => {
    const { requests } = get();
    set({
      requests: requests.map((r) => (r.id === requestId ? { ...r, status: 'rejected' } : r)),
    });
  },

  toggleLedgerDone: (entryId) =>
    set((s) => ({
      ledgerEntries: s.ledgerEntries.map((e) =>
        e.id !== entryId || e.closedAt ? e : withTeacherSide(e, !e.teacherDone, e.teacherPaid),
      ),
    })),

  toggleLedgerPaid: (entryId) =>
    set((s) => ({
      ledgerEntries: s.ledgerEntries.map((e) =>
        e.id !== entryId || e.closedAt ? e : withTeacherSide(e, e.teacherDone, !e.teacherPaid),
      ),
    })),

  confirmStudentReceipt: (entryId) =>
    set((s) => ({
      ledgerEntries: s.ledgerEntries.map((e) => {
        if (e.id !== entryId || e.closedAt || e.studentConfirmedAt) return e;
        const stamp = nowISO();
        const teacherComplete = e.teacherDone && e.teacherPaid;
        return { ...e, studentConfirmedAt: stamp, closedAt: teacherComplete ? stamp : e.closedAt };
      }),
    })),

  evaluateLedgerAutoClose: (now) =>
    set((s) => {
      const nowMs = now ? Date.parse(now) : Date.now();
      let changed = false;
      const ledgerEntries = s.ledgerEntries.map((e) => {
        if (e.closedAt || !e.teacherCompletedAt) return e;
        const elapsedHours = (nowMs - Date.parse(e.teacherCompletedAt)) / 3_600_000;
        if (elapsedHours < AUTO_CLOSE_HOURS) return e;
        changed = true;
        return { ...e, closedAt: new Date(nowMs).toISOString() };
      });
      return changed ? { ledgerEntries } : {};
    }),

  cycleTaskStatus: (taskId) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, status: NEXT_TASK_STATUS[t.status] } : t)),
    })),

  setStudentNote: (studentId, text) =>
    set((s) => {
      const studentNotes = { ...s.studentNotes, [studentId]: text };
      writeStudentNotes(studentNotes);
      return { studentNotes };
    }),

  setFrozen: (frozen) =>
    set((s) => (s.config ? { config: { ...s.config, isFrozen: frozen } } : {})),

  setSubscription: (subscription) => set({ subscription }),

  reset: () =>
    set({
      config: null,
      lessons: [],
      requests: [],
      availabilitySlots: [],
      calendar: { status: 'not_connected', lastSyncedAt: null, busySlots: [], syncState: 'idle' },
      students: [],
      ledgerEntries: [],
      materials: [],
      tasks: [],
      studentNotes: {}, // in-memory only; the localStorage proxy rehydrates on next init
      subscription: null,
      status: 'idle',
      error: null,
    }),
}));
