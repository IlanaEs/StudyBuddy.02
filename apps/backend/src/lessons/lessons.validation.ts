import { z } from 'zod';

// ── PATCH /api/lessons/:id/status ─────────────────────────────────────────────

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const bodySchema = z.object({
  // 'scheduled' is intentionally excluded: lessons start as scheduled automatically.
  status: z.enum(['completed', 'cancelled', 'no_show']),
});

export const updateLessonStatusSchema = z.object({
  params: paramsSchema,
  body: bodySchema,
});

export type UpdateLessonStatusBody = z.infer<typeof bodySchema>;
