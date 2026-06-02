import { z } from 'zod';

const accountTypes = ['independent_student', 'parent_for_child', 'teacher'] as const;

export const completeOAuthSignupSchema = z.object({
  body: z.object({
    account_type: z.enum(accountTypes),
    full_name: z.string().min(1).max(150),
  }),
});

export type CompleteOAuthSignupInput = z.infer<typeof completeOAuthSignupSchema>['body'];
