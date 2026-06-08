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

// ── GET /api/parents/me/children/:childId/schedule ────────────────────────────
// Month-range schedule (lessons + pending bookings) for one child. `from`/`to`
// are ISO datetimes; the range is bounded server-side to a single month-ish
// window (≤ 45 days) to avoid an unbounded scan.

const MAX_SCHEDULE_RANGE_MS = 45 * 24 * 60 * 60 * 1000;

const getChildScheduleQuerySchema = z
  .object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  })
  .refine((q) => new Date(q.to).getTime() > new Date(q.from).getTime(), {
    message: 'to must be after from',
  })
  .refine(
    (q) => new Date(q.to).getTime() - new Date(q.from).getTime() <= MAX_SCHEDULE_RANGE_MS,
    { message: 'range too large' },
  );

export const getChildScheduleSchema = z.object({
  params: z.object({ childId: z.string().uuid() }),
  query: getChildScheduleQuerySchema,
});

export type GetChildScheduleQuery = z.infer<typeof getChildScheduleQuerySchema>;

// ── POST /api/parents/me/children ─────────────────────────────────────────────
// Lightweight "add another child" — name + grade only (no learning goals).

const createChildBodySchema = z.object({
  child_name: z.string().trim().min(1).max(150),
  grade_level: z.string().trim().max(50).nullable().optional(),
});

export const createChildSchema = z.object({
  body: createChildBodySchema,
});

export type CreateChildBody = z.infer<typeof createChildBodySchema>;
