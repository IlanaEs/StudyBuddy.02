import { create } from 'zustand';
import type {
  DashboardLesson,
  DashboardRequest,
  DashboardStudent,
  LedgerEntry,
  TeacherConfig,
  DashboardTab,
  DashboardStatus,
} from '../types/teacherDashboard.types';

// Only the active tab is persisted; entity data is owned by the backend (later tasks).
const STORAGE_KEY = 'sb_teacher_dashboard';

interface TeacherDashboardStore {
  // ── State (single source of truth read by every tab) ──────────────────────
  config: TeacherConfig | null;
  lessons: DashboardLesson[];
  requests: DashboardRequest[];
  students: DashboardStudent[];
  ledgerEntries: LedgerEntry[];
  activeTab: DashboardTab;
  status: DashboardStatus;
  error: string | null;

  // ── Actions ───────────────────────────────────────────────────────────────
  setActiveTab: (tab: DashboardTab) => void;
  setStatus: (status: DashboardStatus, error?: string | null) => void;
  setConfig: (config: TeacherConfig) => void;
  setLessons: (lessons: DashboardLesson[]) => void;
  setRequests: (requests: DashboardRequest[]) => void;
  setStudents: (students: DashboardStudent[]) => void;
  setLedgerEntries: (entries: LedgerEntry[]) => void;
  /**
   * Cross-tab source of truth: accepting a request marks it approved, adds the
   * (backend-created) lesson, and records a ledger entry — from a single write,
   * so the Calendar, the Overview weekly tile, and the Finance tab all reflect
   * it. The lesson is passed in by the caller (mapped from the respond API).
   */
  acceptRequest: (requestId: string, lesson: DashboardLesson) => void;
  /** Declining a request marks it rejected (no lesson/ledger side effects). */
  declineRequest: (requestId: string) => void;
  reset: () => void;
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
  students: [],
  ledgerEntries: [],
  activeTab: readActiveTab(),
  status: 'idle',
  error: null,

  setActiveTab: (tab) => {
    writeActiveTab(tab);
    set({ activeTab: tab });
  },
  setStatus: (status, error = null) => set({ status, error }),
  setConfig: (config) => set({ config }),
  setLessons: (lessons) => set({ lessons }),
  setRequests: (requests) => set({ requests }),
  setStudents: (students) => set({ students }),
  setLedgerEntries: (ledgerEntries) => set({ ledgerEntries }),

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

  reset: () =>
    set({
      config: null,
      lessons: [],
      requests: [],
      students: [],
      ledgerEntries: [],
      status: 'idle',
      error: null,
    }),
}));
