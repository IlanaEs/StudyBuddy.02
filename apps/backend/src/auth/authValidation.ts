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
    if (body.account_type === 'independent_student' && body.role !== 'student') {
      ctx.addIssue({ code: 'custom', path: ['role'], message: 'role must be student for independent_student account_type' });
    }
    if (body.account_type === 'parent_for_child' && body.role !== 'parent') {
      ctx.addIssue({ code: 'custom', path: ['role'], message: 'role must be parent for parent_for_child account_type' });
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
