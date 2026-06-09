import type { DashboardLesson } from '../types/teacherDashboard.types';

// Read-only derivations from the teacher's already-fetched lessons. No API, no
// store mutation — the Students CRM and Finance ledger tables are projections
// over the lessons list.

export type DerivedStudentRow = {
  key: string;
  name: string;
  subjects: string[];
  activeSince: string | null; // earliest lesson
  lessonsCompleted: number;
  upcomingLessons: number;
  lastLesson: string | null; // latest completed lesson
  status: 'active' | 'inactive';
};

const ACTIVE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function deriveStudentsFromLessons(lessons: DashboardLesson[], now: number): DerivedStudentRow[] {
  const byStudent = new Map<string, DashboardLesson[]>();
  for (const l of lessons) {
    const key = l.studentId || l.studentName || l.id;
    const arr = byStudent.get(key) ?? [];
    arr.push(l);
    byStudent.set(key, arr);
  }

  const rows: DerivedStudentRow[] = [];
  for (const [key, group] of byStudent) {
    const subjects = [...new Set(group.map((l) => l.subjectName).filter((s): s is string => !!s))];
    const times = group.map((l) => new Date(l.startsAt).getTime()).filter((t) => !Number.isNaN(t));
    const completed = group.filter((l) => l.status === 'completed');
    const upcoming = group.filter((l) => l.status === 'scheduled' && new Date(l.startsAt).getTime() >= now);
    const lastCompletedTime = completed.length
      ? Math.max(...completed.map((l) => new Date(l.startsAt).getTime()))
      : null;
    const activeSince = times.length ? new Date(Math.min(...times)).toISOString() : null;
    const isActive = upcoming.length > 0 || (lastCompletedTime != null && now - lastCompletedTime < ACTIVE_WINDOW_MS);

    rows.push({
      key,
      name: group[0]?.studentName || 'תלמיד/ה',
      subjects,
      activeSince,
      lessonsCompleted: completed.length,
      upcomingLessons: upcoming.length,
      lastLesson: lastCompletedTime != null ? new Date(lastCompletedTime).toISOString() : null,
      status: isActive ? 'active' : 'inactive',
    });
  }

  // Most-recently-active first.
  return rows.sort((a, b) => (b.upcomingLessons - a.upcomingLessons) || (b.lessonsCompleted - a.lessonsCompleted));
}

export type LedgerRow = {
  lessonId: string;
  date: string;
  studentName: string;
  subjectName: string | null;
  lessonStatus: DashboardLesson['status'];
  hourlyRate: number | null;
  amount: number | null;
  paymentStatus: 'due' | 'upcoming' | 'na';
};

export function deriveLedgerFromLessons(lessons: DashboardLesson[], hourlyRate: number | null): LedgerRow[] {
  return [...lessons]
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
    .map((l) => {
      const hours = (new Date(l.endsAt).getTime() - new Date(l.startsAt).getTime()) / 3_600_000;
      const amount = hourlyRate != null && hours > 0 ? Math.round(hourlyRate * hours) : null;
      const paymentStatus: LedgerRow['paymentStatus'] =
        l.status === 'completed' ? 'due' : l.status === 'scheduled' ? 'upcoming' : 'na';
      return {
        lessonId: l.id,
        date: l.startsAt,
        studentName: l.studentName,
        subjectName: l.subjectName,
        lessonStatus: l.status,
        hourlyRate,
        amount,
        paymentStatus,
      };
    });
}
