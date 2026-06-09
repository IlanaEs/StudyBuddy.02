import { z } from 'zod';

export const academicRepositoryRequestSchema = z.object({
  body: z.object({
    repository_type: z.enum(['institution', 'field', 'subject']),
    requested_name: z.string().trim().min(2).max(150),
  }),
});

export type AcademicRepositoryRequestBody = z.infer<typeof academicRepositoryRequestSchema>['body'];

export const adminAcademicRepositoryRequestsQuerySchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    repository_type: z.enum(['institution', 'field']).optional(),
  }),
});

export type AdminAcademicRepositoryRequestsQuery = z.infer<typeof adminAcademicRepositoryRequestsQuerySchema>['query'];

export const approveAcademicRepositoryRequestSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const rejectAcademicRepositoryRequestSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ reason: z.string().trim().max(500).optional() }),
});
