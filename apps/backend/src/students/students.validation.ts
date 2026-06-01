import { z } from 'zod';

export const createStudentProfileSchema = z.object({
  body: z.object({
    account_type: z.enum(['independent_student', 'parent_for_child']),
    full_name: z.string().min(1).max(150).optional(),
    grade_level: z.string().max(50).nullable().optional(),
    child_name: z.string().min(1).max(150).optional(),
  }).superRefine((body, ctx) => {
    if (body.account_type === 'independent_student' && !body.full_name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['full_name'],
        message: 'full_name is required for independent_student',
      });
    }
    if (body.account_type === 'parent_for_child' && !body.child_name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['child_name'],
        message: 'child_name is required for parent_for_child',
      });
    }
  }),
});

export type CreateStudentProfileBody = z.infer<typeof createStudentProfileSchema>['body'];
