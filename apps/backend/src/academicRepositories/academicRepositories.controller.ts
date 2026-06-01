import type { Request, Response } from 'express';

import {
  approveAdminAcademicRepositoryRequest,
  getAcademicFields,
  getAcademicInstitutions,
  getAdminAcademicRepositoryRequests,
  rejectAdminAcademicRepositoryRequest,
  requestAcademicRepositoryAddition,
} from './academicRepositories.service.js';
import type { AcademicRepositoryRequestBody, AdminAcademicRepositoryRequestsQuery } from './academicRepositories.validation.js';

export async function getAcademicInstitutionsController(_request: Request, response: Response) {
  const institutions = await getAcademicInstitutions();
  response.status(200).json({ data: { institutions } });
}

export async function getAcademicFieldsController(_request: Request, response: Response) {
  const fields = await getAcademicFields();
  response.status(200).json({ data: { fields } });
}

export async function createAcademicRepositoryRequestController(request: Request, response: Response) {
  const body = request.body as AcademicRepositoryRequestBody;
  const currentUser = request.auth!.user;
  const repositoryRequest = await requestAcademicRepositoryAddition(body, currentUser);
  response.status(201).json({ data: { request: repositoryRequest } });
}

export async function getAdminAcademicRepositoryRequestsController(request: Request, response: Response) {
  const query = request.query as AdminAcademicRepositoryRequestsQuery;
  const requests = await getAdminAcademicRepositoryRequests(query);
  response.status(200).json({ data: { requests } });
}

export async function approveAdminAcademicRepositoryRequestController(request: Request, response: Response) {
  const currentUser = request.auth!.user;
  const requestId = request.params.id;
  if (typeof requestId !== 'string') {
    response.status(400).json({ error: 'Missing request id' });
    return;
  }
  const result = await approveAdminAcademicRepositoryRequest(requestId, currentUser);
  response.status(200).json({ data: result });
}

export async function rejectAdminAcademicRepositoryRequestController(request: Request, response: Response) {
  const currentUser = request.auth!.user;
  const requestId = request.params.id;
  if (typeof requestId !== 'string') {
    response.status(400).json({ error: 'Missing request id' });
    return;
  }
  const repositoryRequest = await rejectAdminAcademicRepositoryRequest(requestId, currentUser);
  response.status(200).json({ data: { request: repositoryRequest } });
}
