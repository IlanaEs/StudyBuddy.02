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
   * Cross-tab mechanism: approving a request schedules a lesson AND records a
   * ledger entry from a single write, so the (future) Calendar and Finance tabs
   * both reflect it. No UI triggers this in T0 — it defines the source of truth.
   */
  approveRequest: (requestId: string) => void;
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

  approveRequest: (requestId) => {
    const { requests, lessons, ledgerEntries, config } = get();
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    const lesson: DashboardLesson = {
      id: `lesson-${request.id}`,
      studentId: request.studentId,
      studentName: request.studentName,
      subjectName: request.subjectName,
      startsAt: request.requestedStartAt,
      endsAt: request.requestedEndAt,
      status: 'scheduled',
      meetingLink: null,
      amount: config?.hourlyRate ?? null,
    };

    const entry: LedgerEntry = {
      id: `ledger-${request.id}`,
      type: 'lesson_earned',
      lessonId: lesson.id,
      amount: config?.hourlyRate ?? 0,
      description: request.subjectName,
      createdAt: request.requestedStartAt,
    };

    set({
      requests: requests.map((r) => (r.id === requestId ? { ...r, status: 'approved' } : r)),
      lessons: [...lessons, lesson],
      ledgerEntries: [...ledgerEntries, entry],
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
