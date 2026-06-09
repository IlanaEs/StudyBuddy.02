import { recordAdminAction } from '../admin/admin.service.js';
import type { LocalUser } from '../auth/authTypes.js';
import {
  approveAcademicRepositoryRequest,
  createAcademicRepositoryRequest,
  listAcademicFields,
  listAcademicInstitutions,
  listAcademicRepositoryRequests,
  rejectAcademicRepositoryRequest,
} from './academicRepositories.repository.js';
import type { AcademicRepositoryRequestBody, AdminAcademicRepositoryRequestsQuery } from './academicRepositories.validation.js';

export async function getAcademicInstitutions() {
  return listAcademicInstitutions();
}

export async function getAcademicFields() {
  return listAcademicFields();
}

export async function requestAcademicRepositoryAddition(
  body: AcademicRepositoryRequestBody,
  currentUser: LocalUser,
) {
  return createAcademicRepositoryRequest({
    repositoryType: body.repository_type,
    requestedName: body.requested_name,
    requestedByUserId: currentUser.id,
  });
}

export async function getAdminAcademicRepositoryRequests(query: AdminAcademicRepositoryRequestsQuery) {
  return listAcademicRepositoryRequests({
    status: query.status,
    repositoryType: query.repository_type,
  });
}

export async function approveAdminAcademicRepositoryRequest(requestId: string, currentUser: LocalUser) {
  const result = await approveAcademicRepositoryRequest({ requestId, adminUserId: currentUser.id });
  await recordAdminAction(currentUser, {
    action_type: 'content.approve',
    target_entity_type: 'academic_repository_request',
    target_entity_id: requestId,
    notes: null,
  });
  return result;
}

export async function rejectAdminAcademicRepositoryRequest(
  requestId: string,
  currentUser: LocalUser,
  reason?: string,
) {
  const result = await rejectAcademicRepositoryRequest({ requestId, adminUserId: currentUser.id });
  await recordAdminAction(currentUser, {
    action_type: 'content.reject',
    target_entity_type: 'academic_repository_request',
    target_entity_id: requestId,
    notes: reason ?? null,
  });
  return result;
}
