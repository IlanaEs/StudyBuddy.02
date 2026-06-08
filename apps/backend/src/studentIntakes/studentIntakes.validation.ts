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

const softCriteriaSchema = z
  .object({
    teacher_gender: z.enum(['female', 'male']).nullable().optional(),
    fast_pace: z.boolean().optional(),
    adhd_experience: z.boolean().optional(),
    inclusive_approach: z.boolean().optional(),
  })
  .nullable()
  .optional();

const bodySchema = z
  .object({
    student_id: z.string().uuid(),
    subject_id: z.string().uuid().optional(),
    subject_name: z.string().min(1).max(100).optional(),
    // Off-taxonomy manual-match lead: free-text course + flag, no resolved subject.
    custom_subject_text: z.string().min(1).max(200).optional(),
    needs_manual_match: z.boolean().optional(),
    level: z.string().max(100).nullable().optional(),
    goal: z.string().nullable().optional(),
    location_preference: z.literal('online').default('online'),
    city: z.string().max(100).nullable().optional(),
    budget_min: z.number().nonnegative().nullable().optional(),
    budget_max: z.number().nonnegative().nullable().optional(),
    preferred_days: z.array(z.number().int().min(0).max(6)).nullable().optional(),
    preferred_time_ranges: z.array(preferredTimeRangeSchema).nullable().optional(),
    learning_style: z.string().max(100).nullable().optional(),
    urgency: z.string().max(50).nullable().optional(),
    soft_criteria: softCriteriaSchema,
  })
  // Either a catalog subject (id/name) OR a flagged manual-match free-text course.
  .refine(
    ({ subject_id, subject_name, needs_manual_match, custom_subject_text }) =>
      !!subject_id || !!subject_name?.trim() || (needs_manual_match === true && !!custom_subject_text?.trim()),
    { message: 'subject_id, subject_name, or a manual-match custom_subject_text is required', path: ['subject_id'] },
  )
  // Cross-field: when both budget bounds are present, min must not exceed max.
  .refine(
    ({ budget_min, budget_max }) =>
      budget_min == null || budget_max == null || budget_min <= budget_max,
    { message: 'budget_min must be less than or equal to budget_max', path: ['budget_max'] },
  );

export const createIntakeSchema = z.object({ body: bodySchema });

export type CreateIntakeBody = z.infer<typeof bodySchema>;
