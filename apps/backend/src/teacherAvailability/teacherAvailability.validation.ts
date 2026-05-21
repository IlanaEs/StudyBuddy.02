import { z } from 'zod';

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be a valid HH:mm time');

// ── POST /api/teacher-availability ────────────────────────────────────────────

const createBodySchema = z
  .object({
    day_of_week: z.number().int().min(0).max(6),
    start_time: timeSchema,
    end_time: timeSchema,
    teacher_id: z.string().uuid().optional(),
  })
  .refine(({ start_time, end_time }) => end_time > start_time, {
    message: 'end_time must be after start_time',
    path: ['end_time'],
  });

export const createAvailabilitySlotSchema = z.object({ body: createBodySchema });

export type CreateAvailabilitySlotBody = z.infer<typeof createBodySchema>;

// ── PATCH /api/teacher-availability/:id ──────────────────────────────────────

const updateBodySchema = z
  .object({
    day_of_week: z.number().int().min(0).max(6).optional(),
    start_time: timeSchema.optional(),
    end_time: timeSchema.optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    ({ start_time, end_time }) => {
      if (start_time !== undefined && end_time !== undefined) {
        return end_time > start_time;
      }
      return true;
    },
    {
      message: 'end_time must be after start_time',
      path: ['end_time'],
    },
  );

const idParamSchema = z.object({ id: z.string().uuid() });

export const updateAvailabilitySlotSchema = z.object({
  params: idParamSchema,
  body: updateBodySchema,
});

export type UpdateAvailabilitySlotBody = z.infer<typeof updateBodySchema>;

// ── DELETE /api/teacher-availability/:id ──────────────────────────────────────

export const deleteAvailabilitySlotSchema = z.object({ params: idParamSchema });

// ── GET /api/teacher-availability/:teacherId/available-slots ──────────────────

const availableSlotsParamsSchema = z.object({
  teacherId: z.string().uuid(),
});

const availableSlotsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a valid YYYY-MM-DD date'),
  // Query params arrive as strings; preprocess coerces before range validation.
  duration_minutes: z.preprocess(
    (v) => (v === undefined || v === '' ? undefined : Number(v)),
    z.number().int().min(15).max(180).optional(),
  ),
});

export const getAvailableSlotsSchema = z.object({
  params: availableSlotsParamsSchema,
  query: availableSlotsQuerySchema,
});

export type GetAvailableSlotsQuery = z.infer<typeof availableSlotsQuerySchema>;
