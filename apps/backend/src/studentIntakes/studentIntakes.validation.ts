import { z } from 'zod';

const locationPreferences = ['online', 'frontal', 'both'] as const;

export const createStudentIntakeSchema = z.object({
  body: z.object({
    subject_name: z.string().min(1).max(150),
    sub_level: z.string().max(50).optional().default(''),
    learning_goal: z.string().max(50).nullable().optional(),
    location_preference: z.enum(locationPreferences),
    city: z.string().max(100).optional().default(''),
    budget_min: z.number().nonnegative().nullable().optional(),
    budget_max: z.number().nonnegative().nullable().optional(),
    preferred_days: z.array(z.string()).optional().default([]),
    preferred_time_ranges: z.array(z.string()).optional().default([]),
    learning_style: z.array(z.string()).optional().default([]),
  }),
});

export type CreateStudentIntakeBody = z.infer<typeof createStudentIntakeSchema>['body'];
