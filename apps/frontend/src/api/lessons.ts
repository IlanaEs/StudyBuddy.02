import { apiRequest } from './client';
import type { ApiResponse } from './client';

// ── Teacher lesson list ───────────────────────────────────────────────────────

export type TeacherLessonItem = {
  id: string;
  studentId: string;
  studentName: string;
  subjectName: string | null;
  scheduledStartAt: string;
  scheduledEndAt: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
};

export type GetTeacherLessonsResult = {
  lessons: TeacherLessonItem[];
};

export function getTeacherLessons(
  accessToken: string,
): Promise<ApiResponse<GetTeacherLessonsResult>> {
  return apiRequest<GetTeacherLessonsResult>('/api/lessons/mine', undefined, accessToken);
}

// ── Lesson completion ─────────────────────────────────────────────────────────

export type CompleteLessonPayload = {
  summary: string;
  homework_tasks?: string[];
};

export type CompletedLessonResult = {
  lesson: { id: string; status: string; completedAt: string | null };
  confirmation: { id: string; status: string };
  note: { id: string; sharedSummary: string | null };
  tasks: Array<{ id: string; title: string; status: string }>;
};

export function completeLesson(
  lessonId: string,
  payload: CompleteLessonPayload,
  accessToken: string,
): Promise<ApiResponse<CompletedLessonResult>> {
  return apiRequest<CompletedLessonResult>(
    `/api/lessons/${lessonId}/complete`,
    { method: 'POST', body: JSON.stringify(payload) },
    accessToken,
  );
}
