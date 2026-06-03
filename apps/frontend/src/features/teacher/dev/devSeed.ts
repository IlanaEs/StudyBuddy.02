// Dashboard seed (mock data) for QA + the stakeholder demo. Enabled in two ways,
// both safe for production (which uses neither):
//   1. Local dev: import.meta.env.DEV AND an opt-in localStorage flag (off by default).
//        Enable:  localStorage.setItem('sb_dev_dashboard_seed', '1'); // then reload
//        Disable: localStorage.removeItem('sb_dev_dashboard_seed');
//   2. Staging demo: isDemoStagingMode() — build-time flag AND the allowlisted staging
//      host only (see src/demo/demoMode.ts). Auto-populates the demo link, no console
//      command. Never true on a production domain.
//
// To remove the feature entirely: delete this file and the two guarded branches
// in useTeacherDashboardSeed.ts and InboxPanel.tsx that reference it.

import { isDemoStagingMode } from '../../../demo/demoMode';
import type {
  DashboardRequest,
  DashboardLesson,
  DashboardStudent,
  LedgerEntry,
  Material,
  Task,
  TeacherConfig,
} from '../types/teacherDashboard.types';

const SEED_FLAG = 'sb_dev_dashboard_seed';

/** True in a dev build with the opt-in flag set, OR on the allowlisted staging demo host. */
export function isDashboardSeedEnabled(): boolean {
  if (isDemoStagingMode()) return true;
  if (!import.meta.env.DEV) return false;
  try {
    return localStorage.getItem(SEED_FLAG) === '1';
  } catch {
    return false;
  }
}

/** Mock entities are prefixed so they can never collide with real backend ids. */
export function isMockId(id: string): boolean {
  return id.startsWith('mock-');
}

// ── Time helpers (relative to "now" so the data always looks current) ──────────
function minutesFromNow(mins: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + mins);
  return d.toISOString();
}
function dayAt(dayOffset: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}
// A fixed day in the current calendar month (so "Monthly Income" counts it).
function thisMonthDay(day: number, hour: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(day);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}
// A fixed day in the previous calendar month (excluded from "Monthly Income").
function lastMonthDay(day: number, hour: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  d.setDate(day);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}
function hoursAgo(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

export interface DevSeed {
  config: TeacherConfig;
  lessons: DashboardLesson[];
  requests: DashboardRequest[];
  ledgerEntries: LedgerEntry[];
  students: DashboardStudent[];
  materials: Material[];
  tasks: Task[];
}

export function buildDevSeed(): DevSeed {
  const config: TeacherConfig = {
    fullName: 'מורה לדוגמה',
    isVerified: true, // so Inbox Accept/Decline are enabled for QA
    subjects: ['מתמטיקה', 'פיזיקה', 'אנגלית'],
    weeklyTimeBlocks: ['ראשון-morning', 'שני-evening', 'רביעי-afternoon'],
    maxActiveStudents: 10,
    weeklyTeachingHours: 12,
    hourlyRate: 150,
    introSessionPricing: 'half_price',
    bookingApproval: 'manual',
  };

  const lessons: DashboardLesson[] = [
    {
      id: 'mock-lesson-soon',
      studentId: 'mock-student-1',
      studentName: 'דנה לוי',
      subjectName: 'מתמטיקה',
      startsAt: minutesFromNow(90), // upcoming → drives Next Lesson countdown
      endsAt: minutesFromNow(150),
      status: 'scheduled',
      meetingLink: null,
      amount: 150,
    },
    {
      id: 'mock-lesson-2',
      studentId: 'mock-student-2',
      studentName: 'יוסי כהן',
      subjectName: 'פיזיקה',
      startsAt: dayAt(1, 17, 0),
      endsAt: dayAt(1, 18, 0),
      status: 'scheduled',
      meetingLink: null,
      amount: 150,
    },
    {
      id: 'mock-lesson-3',
      studentId: 'mock-student-1',
      studentName: 'דנה לוי',
      subjectName: 'מתמטיקה',
      startsAt: dayAt(3, 10, 0),
      endsAt: dayAt(3, 11, 0),
      status: 'scheduled',
      meetingLink: null,
      amount: 150,
    },
  ];

  const requests: DashboardRequest[] = [
    {
      id: 'mock-req-1',
      studentId: 'mock-student-3',
      studentName: 'מאיה גולן',
      subjectName: 'אנגלית',
      requestedStartAt: dayAt(2, 16, 0),
      requestedEndAt: dayAt(2, 17, 0),
      status: 'pending',
      studentMessage: 'אשמח לעזרה לקראת המבחן הקרוב.',
      createdAt: minutesFromNow(-120),
    },
    {
      id: 'mock-req-2',
      studentId: 'mock-student-4',
      studentName: 'אורי בן-דוד',
      subjectName: 'כימיה',
      requestedStartAt: dayAt(4, 18, 0),
      requestedEndAt: dayAt(4, 19, 0),
      status: 'pending',
      studentMessage: null,
      createdAt: minutesFromNow(-30),
    },
    {
      // Missing subject + studentId → exercises the "מקצוע לא צוין" fallback.
      id: 'mock-req-3',
      studentId: '',
      studentName: 'נועה אברהם',
      subjectName: null,
      requestedStartAt: dayAt(2, 9, 0),
      requestedEndAt: dayAt(2, 10, 0),
      status: 'pending',
      studentMessage: 'שלום, אפשר לקבוע שיעור היכרות?',
      createdAt: minutesFromNow(-10),
    },
  ];

  // Ledger rows spanning every workflow state, so the Finance tab + KPIs are
  // non-trivial on load. One pending-student row is intentionally >48h old to
  // exercise the auto-close (Flash Glow + Lock) the moment the tab mounts.
  const ledgerEntries: LedgerEntry[] = [
    {
      // In Progress — nothing checked yet.
      id: 'mock-ledger-1',
      type: 'lesson_earned',
      lessonId: 'mock-lesson-soon',
      amount: 150,
      description: 'מתמטיקה',
      createdAt: thisMonthDay(2, 16),
      studentId: 'mock-student-1',
      studentName: 'דנה לוי',
      subjectName: 'מתמטיקה',
      teacherDone: false,
      teacherPaid: false,
      teacherCompletedAt: null,
      studentConfirmedAt: null,
      closedAt: null,
    },
    {
      // In Progress — Done checked, not yet Paid (still needs both).
      id: 'mock-ledger-2',
      type: 'lesson_earned',
      lessonId: 'mock-lesson-2',
      amount: 150,
      description: 'פיזיקה',
      createdAt: thisMonthDay(3, 17),
      studentId: 'mock-student-2',
      studentName: 'יוסי כהן',
      subjectName: 'פיזיקה',
      teacherDone: true,
      teacherPaid: false,
      teacherCompletedAt: null,
      studentConfirmedAt: null,
      closedAt: null,
    },
    {
      // Pending Student — teacher done both, timer fresh (3h ago), no student yet.
      id: 'mock-ledger-3',
      type: 'lesson_earned',
      lessonId: 'mock-lesson-3',
      amount: 200,
      description: 'מתמטיקה',
      createdAt: thisMonthDay(1, 10),
      studentId: 'mock-student-1',
      studentName: 'דנה לוי',
      subjectName: 'מתמטיקה',
      teacherDone: true,
      teacherPaid: true,
      teacherCompletedAt: hoursAgo(3),
      studentConfirmedAt: null,
      closedAt: null,
    },
    {
      // Pending Student but past the 48h window → auto-closes on mount.
      id: 'mock-ledger-4',
      type: 'lesson_earned',
      lessonId: null,
      amount: 150,
      description: 'אנגלית',
      createdAt: dayAt(-2, 14),
      studentId: 'mock-student-3',
      studentName: 'מאיה גולן',
      subjectName: 'אנגלית',
      teacherDone: true,
      teacherPaid: true,
      teacherCompletedAt: hoursAgo(50),
      studentConfirmedAt: null,
      closedAt: null,
    },
    {
      // Closed last month — dual approval already reached (student confirmed).
      id: 'mock-ledger-5',
      type: 'lesson_earned',
      lessonId: null,
      amount: 180,
      description: 'פיזיקה',
      createdAt: lastMonthDay(20, 18),
      studentId: 'mock-student-2',
      studentName: 'יוסי כהן',
      subjectName: 'פיזיקה',
      teacherDone: true,
      teacherPaid: true,
      teacherCompletedAt: lastMonthDay(20, 19),
      studentConfirmedAt: lastMonthDay(21, 9),
      closedAt: lastMonthDay(21, 9),
    },
  ];

  // Students CRM (T4). IDs align with the lesson/ledger mock ids so the Account
  // Status tab shows real rows. יוסי כהן (mock-student-2) carries open debt via
  // mock-ledger-2 (delivered but unpaid).
  const students: DashboardStudent[] = [
    {
      id: 'mock-student-1',
      name: 'דנה לוי',
      subjectNames: ['מתמטיקה'],
      status: 'active',
      activeLessons: 2,
    },
    {
      id: 'mock-student-2',
      name: 'יוסי כהן',
      subjectNames: ['פיזיקה'],
      status: 'active',
      activeLessons: 1,
    },
    {
      id: 'mock-student-3',
      name: 'מאיה גולן',
      subjectNames: ['אנגלית'],
      status: 'active',
      activeLessons: 1,
    },
    {
      id: 'mock-student-4',
      name: 'אורי בן-דוד',
      subjectNames: ['כימיה'],
      status: 'inactive',
      activeLessons: 0,
    },
  ];

  const materials: Material[] = [
    {
      id: 'mock-material-1',
      studentId: 'mock-student-1',
      lessonId: 'mock-lesson-soon',
      name: 'דף נוסחאות — אלגברה.pdf',
      kind: 'pdf',
      url: null,
      createdAt: dayAt(-4, 12),
    },
    {
      id: 'mock-material-2',
      studentId: 'mock-student-1',
      lessonId: null,
      name: 'תרגול משוואות ריבועיות.docx',
      kind: 'doc',
      url: null,
      createdAt: dayAt(-9, 15),
    },
    {
      id: 'mock-material-3',
      studentId: 'mock-student-2',
      lessonId: 'mock-lesson-2',
      name: 'סיכום חוקי ניוטון.pdf',
      kind: 'pdf',
      url: null,
      createdAt: dayAt(-2, 9),
    },
    {
      id: 'mock-material-4',
      studentId: 'mock-student-2',
      lessonId: null,
      name: 'סרטון הסבר — תנע',
      kind: 'link',
      url: null,
      createdAt: dayAt(-1, 18),
    },
  ];

  const tasks: Task[] = [
    {
      id: 'mock-task-1',
      studentId: 'mock-student-1',
      lessonId: 'mock-lesson-soon',
      title: 'לפתור תרגילים 1–10 בעמוד 42',
      status: 'assigned',
      dueAt: dayAt(2, 20),
      createdAt: dayAt(-1, 16),
    },
    {
      id: 'mock-task-2',
      studentId: 'mock-student-1',
      lessonId: null,
      title: 'לחזור על נוסחאות לקראת המבחן',
      status: 'in_progress',
      dueAt: dayAt(5, 20),
      createdAt: dayAt(-3, 10),
    },
    {
      id: 'mock-task-3',
      studentId: 'mock-student-2',
      lessonId: 'mock-lesson-2',
      title: 'לסכם את שיעור חוקי ניוטון',
      status: 'completed',
      dueAt: dayAt(-1, 20),
      createdAt: dayAt(-6, 14),
    },
    {
      id: 'mock-task-4',
      studentId: 'mock-student-2',
      lessonId: null,
      title: 'לתרגל בעיות תנע',
      status: 'assigned',
      dueAt: dayAt(4, 20),
      createdAt: dayAt(-1, 11),
    },
  ];

  return { config, lessons, requests, ledgerEntries, students, materials, tasks };
}
