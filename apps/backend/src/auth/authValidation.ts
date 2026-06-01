import { z } from 'zod';

const selfSignupRoles = ['teacher', 'student', 'parent'] as const;
const accountTypes = ['independent_student', 'parent_for_child'] as const;

export const signupSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(selfSignupRoles),
    account_type: z.enum(accountTypes).optional(),
    full_name: z.string().min(1).max(150),
  }).superRefine((body, ctx) => {
    if (!body.account_type) return;
    const expectedRole = body.account_type === 'parent_for_child' ? 'parent' : 'student';
    if (body.role !== expectedRole) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['role'],
        message: 'role must match account_type',
      });
    }
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const completeOAuthSignupSchema = z.object({
  body: z.object({
    account_type: z.enum(accountTypes),
    full_name: z.string().min(1).max(150),
  }),
});

export type SignupInput = z.infer<typeof signupSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type CompleteOAuthSignupInput = z.infer<typeof completeOAuthSignupSchema>['body'];
