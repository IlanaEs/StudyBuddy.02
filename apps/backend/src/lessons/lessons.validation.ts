import { z } from 'zod';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

// ── PATCH /api/lessons/:id/status ─────────────────────────────────────────────

const updateStatusBodySchema = z.object({
  // 'completed' is intentionally excluded: use POST /:id/complete for the full
  // atomic completion flow (creates lesson_confirmation, lesson_note, homework).
  // 'scheduled' is also excluded: lessons start as scheduled automatically.
  status: z.enum(['cancelled', 'no_show'], {
    errorMap: () => ({
      message:
        "Use POST /api/lessons/:id/complete to complete lessons. " +
        "This endpoint only accepts 'cancelled' or 'no_show'.",
    }),
  }),
});

export const updateLessonStatusSchema = z.object({
  params: paramsSchema,
  body: updateStatusBodySchema,
});

export type UpdateLessonStatusBody = z.infer<typeof updateStatusBodySchema>;

// ── POST /api/lessons/:id/complete ────────────────────────────────────────────

const completeLessonBodySchema = z.object({
  // Mandatory lesson summary shown to the parent.
  summary: z.string().min(1, 'Summary is required').max(2000),
  // Optional homework task titles. Empty array = no homework.
  homework_tasks: z
    .array(z.string().min(1).max(500))
    .max(20)
    .optional()
    .default([]),
});

export const completeLessonSchema = z.object({
  params: paramsSchema,
  body: completeLessonBodySchema,
});

export type CompleteLessonBody = z.infer<typeof completeLessonBodySchema>;
