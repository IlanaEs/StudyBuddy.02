import { z } from 'zod';

const isoDatetimeSchema = z.string().datetime({ offset: true });
const idParamSchema = z.object({ id: z.string().uuid() });

// ── GET /api/teacher-availability-exceptions/me ───────────────────────────────

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

const getMeQuerySchema = z.object({
  teacher_id: z.string().uuid().optional(),
  start_date: dateStringSchema.optional(),
  end_date: dateStringSchema.optional(),
});

export const getExceptionsSchema = z.object({ query: getMeQuerySchema });

export type GetExceptionsQuery = z.infer<typeof getMeQuerySchema>;

// ── POST /api/teacher-availability-exceptions ─────────────────────────────────

const createBodySchema = z
  .object({
    starts_at: isoDatetimeSchema,
    ends_at: isoDatetimeSchema,
    is_all_day: z.boolean().default(false),
    reason: z.string().max(500).nullish(),
    teacher_id: z.string().uuid().optional(),
  })
  .refine(({ starts_at, ends_at }) => new Date(ends_at) > new Date(starts_at), {
    message: 'ends_at must be after starts_at',
    path: ['ends_at'],
  });

export const createExceptionSchema = z.object({ body: createBodySchema });

export type CreateExceptionBody = z.infer<typeof createBodySchema>;

// ── PATCH /api/teacher-availability-exceptions/:id ────────────────────────────

const updateBodySchema = z
  .object({
    starts_at: isoDatetimeSchema.optional(),
    ends_at: isoDatetimeSchema.optional(),
    is_all_day: z.boolean().optional(),
    reason: z.string().max(500).nullish(),
  })
  .refine(
    ({ starts_at, ends_at }) => {
      if (starts_at !== undefined && ends_at !== undefined) {
        return new Date(ends_at) > new Date(starts_at);
      }
      return true;
    },
    {
      message: 'ends_at must be after starts_at',
      path: ['ends_at'],
    },
  );

export const updateExceptionSchema = z.object({
  params: idParamSchema,
  body: updateBodySchema,
});

export type UpdateExceptionBody = z.infer<typeof updateBodySchema>;

// ── DELETE /api/teacher-availability-exceptions/:id ───────────────────────────

export const deleteExceptionSchema = z.object({ params: idParamSchema });
