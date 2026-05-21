import { z } from 'zod';

const bodySchema = z
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

export const createBookingRequestSchema = z.object({ body: bodySchema });

export type CreateBookingRequestBody = z.infer<typeof bodySchema>;
