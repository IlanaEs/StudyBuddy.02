import { z } from 'zod';

const locationPreferences = ['online', 'frontal', 'both'] as const;

export const createStudentOnboardingSchema = z.object({
  body: z.object({
    full_name: z.string().min(1).max(150),
    grade_level: z.string().max(50).nullable().optional(),
    sub_level: z.string().max(50).optional().default(''),
    subject_name: z.string().min(1).max(150),
    learning_goal: z.string().max(50).nullable().optional(),
    location_preference: z.enum(locationPreferences),
    city: z.string().max(100).optional().default(''),
    budget_min: z.number().nonnegative().nullable().optional(),
    budget_max: z.number().nonnegative().nullable().optional(),
    preferred_days: z.array(z.string()).optional().default([]),
    preferred_time_ranges: z.array(z.string()).optional().default([]),
    learning_style: z.array(z.string()).optional().default([]),
    soft_preferences: z.array(z.string()).optional().default([]),
    child_name: z.string().min(1).max(150).optional(),
  }),
});

export type CreateStudentOnboardingBody = z.infer<typeof createStudentOnboardingSchema>['body'];
