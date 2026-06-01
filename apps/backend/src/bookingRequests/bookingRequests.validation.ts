import { z } from 'zod';

// ── POST /api/booking-requests ────────────────────────────────────────────────

const createBodySchema = z
  .object({
    match_result_id: z.string().uuid(),
    requested_start_at: z.string().datetime({ offset: true }),
    requested_end_at: z.string().datetime({ offset: true }),
    student_message: z.string().optional(),
  })
  .refine(
    ({ requested_start_at, requested_end_at }) =>
      new Date(requested_end_at) > new Date(requested_start_at),
    {
      message: 'requested_end_at must be after requested_start_at',
      path: ['requested_end_at'],
    },
  );

export const createBookingRequestSchema = z.object({ body: createBodySchema });

export type CreateBookingRequestBody = z.infer<typeof createBodySchema>;

// ── POST /api/booking-requests/:id/respond ────────────────────────────────────

const respondParamsSchema = z.object({
  id: z.string().uuid(),
});

const respondBodySchema = z.object({
  response: z.enum(['approve', 'reject']),
  teacher_response_message: z.string().optional(),
});

export const respondToBookingRequestSchema = z.object({
  params: respondParamsSchema,
  body: respondBodySchema,
});

export type RespondToBookingRequestBody = z.infer<typeof respondBodySchema>;
