import { z } from 'zod';

// Multi-account creation. admin is intentionally excluded — admin accounts are
// provisioned manually, never self-created.
export const createAccountSchema = z.object({
  body: z.object({
    role: z.enum(['teacher', 'student', 'parent']),
  }),
});

export type CreateAccountBody = z.infer<typeof createAccountSchema>['body'];
