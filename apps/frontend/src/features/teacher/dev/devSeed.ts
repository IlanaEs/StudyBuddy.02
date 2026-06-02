// DEV-ONLY dashboard seed for QA. Never runs in production: gated by
// import.meta.env.DEV AND an opt-in localStorage flag (off by default).
//
// Enable:  localStorage.setItem('sb_dev_dashboard_seed', '1'); // then reload
// Disable: localStorage.removeItem('sb_dev_dashboard_seed');
//
// To remove the feature entirely: delete this file and the two guarded branches
// in useTeacherDashboardSeed.ts and InboxPanel.tsx that reference it.

import type {
  DashboardRequest,
  DashboardLesson,
  TeacherConfig,
} from '../types/teacherDashboard.types';

const SEED_FLAG = 'sb_dev_dashboard_seed';

/** True only in a dev build with the opt-in flag set. */
export function isDashboardSeedEnabled(): boolean {
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

export interface DevSeed {
  config: TeacherConfig;
  lessons: DashboardLesson[];
  requests: DashboardRequest[];
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

  return { config, lessons, requests };
}
