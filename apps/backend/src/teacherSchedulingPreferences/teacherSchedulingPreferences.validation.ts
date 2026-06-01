import { z } from 'zod';

// ── GET /api/teacher-scheduling-preferences/me ────────────────────────────────

const getQuerySchema = z.object({
  teacher_id: z.string().uuid().optional(),
});

export const getSchedulingPreferencesSchema = z.object({ query: getQuerySchema });

export type GetSchedulingPreferencesQuery = z.infer<typeof getQuerySchema>;

// ── PATCH /api/teacher-scheduling-preferences/me ─────────────────────────────

const updateBodySchema = z
  .object({
    default_lesson_duration_minutes: z.number().int().min(15).max(180).optional(),
    default_break_duration_minutes: z.number().int().min(0).max(60).optional(),
    slot_alignment: z.enum(['window_start', 'round_hour']).optional(),
    teacher_id: z.string().uuid().optional(),
  })
  .refine(
    ({ default_lesson_duration_minutes, default_break_duration_minutes, slot_alignment }) =>
      default_lesson_duration_minutes !== undefined ||
      default_break_duration_minutes !== undefined ||
      slot_alignment !== undefined,
    { message: 'At least one preference field must be provided' },
  );

export const updateSchedulingPreferencesSchema = z.object({ body: updateBodySchema });

export type UpdateSchedulingPreferencesBody = z.infer<typeof updateBodySchema>;
