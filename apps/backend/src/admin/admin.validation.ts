import { z } from 'zod';

// ── GET /api/admin/audit-log ──────────────────────────────────────────────────
// Read-only, paginated, optionally filtered by actor / target / action.

const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
  actor_id: z.string().uuid().optional(),
  target_entity_type: z.string().trim().min(1).max(100).optional(),
  target_entity_id: z.string().uuid().optional(),
  action_type: z.string().trim().min(1).max(100).optional(),
});

export const getAuditLogSchema = z.object({
  query: auditLogQuerySchema,
});

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

// ── Users CRM (read-only directory) ───────────────────────────────────────────

const crmPaginationShape = {
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(100).optional(),
};

const teachersQuerySchema = z.object({
  ...crmPaginationShape,
  status: z.enum(['active', 'inactive', 'blocked']).optional(),
  verified: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

const studentsQuerySchema = z.object({
  ...crmPaginationShape,
  account_type: z.enum(['independent', 'parent_managed']).optional(),
});

const parentsQuerySchema = z.object({
  ...crmPaginationShape,
});

export const getTeachersCrmSchema = z.object({ query: teachersQuerySchema });
export const getStudentsCrmSchema = z.object({ query: studentsQuerySchema });
export const getParentsCrmSchema = z.object({ query: parentsQuerySchema });

export type TeachersCrmQuery = z.infer<typeof teachersQuerySchema>;
export type StudentsCrmQuery = z.infer<typeof studentsQuerySchema>;
export type ParentsCrmQuery = z.infer<typeof parentsQuerySchema>;

// ── Teacher approval queue ────────────────────────────────────────────────────

const approvalQueueQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
});

export const getTeacherApprovalsSchema = z.object({ query: approvalQueueQuerySchema });

export const approveTeacherSchema = z.object({
  params: z.object({ teacherId: z.string().uuid() }),
});

export const rejectTeacherSchema = z.object({
  params: z.object({ teacherId: z.string().uuid() }),
  body: z.object({ reason: z.string().trim().min(1).max(500) }),
});

export type ApprovalQueueQuery = z.infer<typeof approvalQueueQuerySchema>;
