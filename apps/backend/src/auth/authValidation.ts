import { z } from 'zod';

const selfSignupRoles = ['teacher', 'student', 'parent'] as const;

export const signupSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(selfSignupRoles),
    full_name: z.string().min(1).max(150),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

const oauthSignupRoles = ['student', 'parent'] as const;

export const completeOAuthSignupSchema = z.object({
  body: z.object({
    role: z.enum(oauthSignupRoles),
    full_name: z.string().min(1).max(150),
  }),
});

export type SignupInput = z.infer<typeof signupSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type CompleteOAuthSignupInput = z.infer<typeof completeOAuthSignupSchema>['body'];
