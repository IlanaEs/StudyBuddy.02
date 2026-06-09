import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAnyRole, requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../validation/requestValidation.js';
import {
  approveAdminAcademicRepositoryRequestController,
  createAcademicRepositoryRequestController,
  getAcademicFieldsController,
  getAcademicInstitutionsController,
  getAdminAcademicRepositoryRequestsController,
  rejectAdminAcademicRepositoryRequestController,
} from './academicRepositories.controller.js';
import {
  academicRepositoryRequestSchema,
  adminAcademicRepositoryRequestsQuerySchema,
  approveAcademicRepositoryRequestSchema,
  rejectAcademicRepositoryRequestSchema,
} from './academicRepositories.validation.js';

export const academicRepositoriesRouter = Router();

academicRepositoriesRouter.get('/academic-institutions', asyncHandler(getAcademicInstitutionsController));
academicRepositoriesRouter.get('/academic-fields', asyncHandler(getAcademicFieldsController));
academicRepositoriesRouter.post(
  '/academic-repository-requests',
  requireAuth,
  validateRequest(academicRepositoryRequestSchema),
  asyncHandler(createAcademicRepositoryRequestController),
);

academicRepositoriesRouter.get(
  '/admin/academic-repository-requests',
  requireAuth,
  requireAnyRole(['admin']),
  validateRequest(adminAcademicRepositoryRequestsQuerySchema),
  asyncHandler(getAdminAcademicRepositoryRequestsController),
);

academicRepositoriesRouter.post(
  '/admin/academic-repository-requests/:id/approve',
  requireAuth,
  requireAnyRole(['admin']),
  validateRequest(approveAcademicRepositoryRequestSchema),
  asyncHandler(approveAdminAcademicRepositoryRequestController),
);

academicRepositoriesRouter.post(
  '/admin/academic-repository-requests/:id/reject',
  requireAuth,
  requireAnyRole(['admin']),
  validateRequest(rejectAcademicRepositoryRequestSchema),
  asyncHandler(rejectAdminAcademicRepositoryRequestController),
);
