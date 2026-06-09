import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { validateRequest } from '../validation/requestValidation.js';
import {
  approveTeacherController,
  getAuditLogController,
  getMatchingInsightsController,
  getOverviewController,
  getParentsCrmController,
  getStudentsCrmController,
  getTeacherApprovalsController,
  getTeachersCrmController,
  rejectTeacherController,
} from './admin.controller.js';
import {
  approveTeacherSchema,
  getAuditLogSchema,
  getParentsCrmSchema,
  getStudentsCrmSchema,
  getTeacherApprovalsSchema,
  getTeachersCrmSchema,
  rejectTeacherSchema,
} from './admin.validation.js';

export const adminRouter = Router();

// The admin console is the highest-privilege surface. EVERY route requires an
// authenticated user with the flat 'admin' role — enforced server-side here,
// never by UI visibility alone.
adminRouter.use(requireAuth);
adminRouter.use(requireRole('admin'));

// GET /api/admin/overview
// Control Tower KPIs: 8 system counts + 5 funnel rates. Read-only, no params.
adminRouter.get('/overview', asyncHandler(getOverviewController));

// GET /api/admin/matching-insights
// Marketplace BI: demand/supply, failed searches, most-requested, funnel,
// recruitment recommendations. Read-only analytics (engine NOT modified).
adminRouter.get('/matching-insights', asyncHandler(getMatchingInsightsController));

// Users CRM — read-only people directory (3 sub-tabs). Paginated + search + filters.
// GET /api/admin/teachers?page=&per_page=&q=&status=&verified=
adminRouter.get('/teachers', validateRequest(getTeachersCrmSchema), asyncHandler(getTeachersCrmController));
// GET /api/admin/students?page=&per_page=&q=&account_type=
adminRouter.get('/students', validateRequest(getStudentsCrmSchema), asyncHandler(getStudentsCrmController));
// GET /api/admin/parents?page=&per_page=&q=
adminRouter.get('/parents', validateRequest(getParentsCrmSchema), asyncHandler(getParentsCrmController));

// Teacher approval queue (participation gate). Every action audits to admin_actions.
// GET /api/admin/teacher-approvals?page=&per_page=
adminRouter.get('/teacher-approvals', validateRequest(getTeacherApprovalsSchema), asyncHandler(getTeacherApprovalsController));
// POST /api/admin/teacher-approvals/:teacherId/approve  → is_verified=true (matchable)
adminRouter.post('/teacher-approvals/:teacherId/approve', validateRequest(approveTeacherSchema), asyncHandler(approveTeacherController));
// POST /api/admin/teacher-approvals/:teacherId/reject  { reason }
adminRouter.post('/teacher-approvals/:teacherId/reject', validateRequest(rejectTeacherSchema), asyncHandler(rejectTeacherController));

// GET /api/admin/audit-log?page=&per_page=&actor_id=&target_entity_type=&target_entity_id=&action_type=
// Read-only view over admin_actions — the audit-log substrate the rest of the
// admin console writes to via recordAdminAction().
adminRouter.get('/audit-log', validateRequest(getAuditLogSchema), asyncHandler(getAuditLogController));
