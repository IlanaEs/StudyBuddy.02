import { z } from 'zod';

export const createStudentProfileSchema = z.object({
  body: z.object({
    full_name: z.string().min(1).max(150),
    grade_level: z.string().max(50).nullable().optional(),
    child_name: z.string().min(1).max(150).optional(),
  }),
});

export type CreateStudentProfileBody = z.infer<typeof createStudentProfileSchema>['body'];
