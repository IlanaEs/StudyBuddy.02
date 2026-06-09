import type { Request, Response } from 'express';

import {
  approveTeacher,
  getAuditLog,
  getMatchingInsights,
  getOverview,
  getParentsCrm,
  getStudentsCrm,
  getTeacherApprovalQueue,
  getTeachersCrm,
  rejectTeacher,
} from './admin.service.js';
import type {
  ApprovalQueueQuery,
  AuditLogQuery,
  ParentsCrmQuery,
  StudentsCrmQuery,
  TeachersCrmQuery,
} from './admin.validation.js';

export async function getOverviewController(_request: Request, response: Response) {
  const data = await getOverview();
  response.status(200).json({ data });
}

export async function getTeachersCrmController(request: Request, response: Response) {
  const data = await getTeachersCrm(request.query as unknown as TeachersCrmQuery);
  response.status(200).json({ data });
}

export async function getStudentsCrmController(request: Request, response: Response) {
  const data = await getStudentsCrm(request.query as unknown as StudentsCrmQuery);
  response.status(200).json({ data });
}

export async function getParentsCrmController(request: Request, response: Response) {
  const data = await getParentsCrm(request.query as unknown as ParentsCrmQuery);
  response.status(200).json({ data });
}

export async function getMatchingInsightsController(_request: Request, response: Response) {
  const data = await getMatchingInsights();
  response.status(200).json({ data });
}

export async function getTeacherApprovalsController(request: Request, response: Response) {
  const data = await getTeacherApprovalQueue(request.query as unknown as ApprovalQueueQuery);
  response.status(200).json({ data });
}

export async function approveTeacherController(request: Request, response: Response) {
  const teacherId = request.params['teacherId'] as string;
  await approveTeacher(request.auth!.user, teacherId);
  response.status(200).json({ data: { id: teacherId, approval_status: 'approved' } });
}

export async function rejectTeacherController(request: Request, response: Response) {
  const teacherId = request.params['teacherId'] as string;
  const { reason } = request.body as { reason: string };
  await rejectTeacher(request.auth!.user, teacherId, reason);
  response.status(200).json({ data: { id: teacherId, approval_status: 'rejected' } });
}

export async function getAuditLogController(request: Request, response: Response) {
  const query = request.query as unknown as AuditLogQuery;

  const data = await getAuditLog({
    page: query.page,
    per_page: query.per_page,
    actorId: query.actor_id,
    targetEntityType: query.target_entity_type,
    targetEntityId: query.target_entity_id,
    actionType: query.action_type,
  });

  response.status(200).json({ data });
}
