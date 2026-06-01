import { z } from 'zod';

// HH:MM — 00:00–23:59
const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

const preferredTimeRangeSchema = z
  .object({
    start: z.string().regex(HH_MM, 'start must be in HH:MM format'),
    end: z.string().regex(HH_MM, 'end must be in HH:MM format'),
  })
  .refine(({ start, end }) => start < end, {
    message: 'time range start must be before end',
  });

const bodySchema = z
  .object({
    student_id: z.string().uuid(),
    subject_id: z.string().uuid().optional(),
    subject_name: z.string().min(1).max(100).optional(),
    level: z.string().max(100).nullable().optional(),
    goal: z.string().nullable().optional(),
    location_preference: z.enum(['online', 'frontal', 'both']),
    city: z.string().max(100).nullable().optional(),
    budget_min: z.number().nonnegative().nullable().optional(),
    budget_max: z.number().nonnegative().nullable().optional(),
    preferred_days: z.array(z.number().int().min(0).max(6)).nullable().optional(),
    preferred_time_ranges: z.array(preferredTimeRangeSchema).nullable().optional(),
    learning_style: z.string().max(100).nullable().optional(),
    urgency: z.string().max(50).nullable().optional(),
  })
  // Cross-field: frontal location requires a city.
  .refine(
    ({ location_preference, city }) =>
      location_preference !== 'frontal' || !!(city && city.trim().length > 0),
    { message: 'city is required when location_preference is frontal', path: ['city'] },
  )
  .refine(({ subject_id, subject_name }) => !!subject_id || !!subject_name?.trim(), {
    message: 'subject_id or subject_name is required',
    path: ['subject_id'],
  })
  // Cross-field: when both budget bounds are present, min must not exceed max.
  .refine(
    ({ budget_min, budget_max }) =>
      budget_min == null || budget_max == null || budget_min <= budget_max,
    { message: 'budget_min must be less than or equal to budget_max', path: ['budget_max'] },
  );

export const createIntakeSchema = z.object({ body: bodySchema });

export type CreateIntakeBody = z.infer<typeof bodySchema>;
