import { z } from 'zod';

// ── GET /api/parents/me/dashboard ─────────────────────────────────────────────

const getDashboardQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
});

export const getDashboardSchema = z.object({
  query: getDashboardQuerySchema,
});

export type GetDashboardQuery = z.infer<typeof getDashboardQuerySchema>;

// ── POST /api/parents/me/lesson-confirmations/:id/approve ─────────────────────

export const approveConfirmationSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

// ── PATCH /api/parents/me/homework-tasks/:id ──────────────────────────────────

const updateHomeworkBodySchema = z.object({
  status: z.enum(['open', 'in_progress', 'completed']),
});

export const updateHomeworkTaskSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: updateHomeworkBodySchema,
});

export type UpdateHomeworkTaskBody = z.infer<typeof updateHomeworkBodySchema>;
