// Pure Students-CRM helpers — the single place that slices materials/tasks by
// student or lesson and filters the student list. React/store-free so the T1
// Next-Lesson brief (lesson-scoped) and the T4 student file (student-scoped) can
// both reuse them. Mirrors utils/ledger.ts.
import type { DashboardStudent, Material, Task } from '../types/teacherDashboard.types';

/** Materials attached to one student (the student file). */
export function studentMaterials(materials: Material[], studentId: string): Material[] {
  return materials.filter((m) => m.studentId === studentId);
}
/** Materials attached to one lesson (T1 Next-Lesson brief wiring later). */
export function lessonMaterials(materials: Material[], lessonId: string): Material[] {
  return materials.filter((m) => m.lessonId === lessonId);
}

/** Homework tasks for one student (the student file). */
export function studentTasks(tasks: Task[], studentId: string): Task[] {
  return tasks.filter((t) => t.studentId === studentId);
}
/** Homework tasks for one lesson (T1 Next-Lesson brief wiring later). */
export function lessonTasks(tasks: Task[], lessonId: string): Task[] {
  return tasks.filter((t) => t.lessonId === lessonId);
}

/** Sidebar quick-search: case-insensitive match on name or any subject. */
export function filterStudents(students: DashboardStudent[], query: string): DashboardStudent[] {
  const q = query.trim().toLowerCase();
  if (!q) return students;
  return students.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.subjectNames.some((subject) => subject.toLowerCase().includes(q)),
  );
}
