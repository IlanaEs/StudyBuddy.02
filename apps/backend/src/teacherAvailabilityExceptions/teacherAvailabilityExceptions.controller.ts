import type { Request, Response } from 'express';

import {
  createAvailabilityException,
  deleteAvailabilityException,
  getMyExceptions,
  updateAvailabilityException,
} from './teacherAvailabilityExceptions.service.js';
import type {
  CreateExceptionBody,
  GetExceptionsQuery,
  UpdateExceptionBody,
} from './teacherAvailabilityExceptions.validation.js';

export async function getMyExceptionsController(request: Request, response: Response) {
  const currentUser = request.auth!.user;
  const query = request.query as unknown as GetExceptionsQuery;
  const exceptions = await getMyExceptions(currentUser, query);
  response.status(200).json({ data: { availability_exceptions: exceptions } });
}

export async function createExceptionController(request: Request, response: Response) {
  const body = request.body as CreateExceptionBody;
  const currentUser = request.auth!.user;
  const exception = await createAvailabilityException(body, currentUser);
  response.status(201).json({ data: { availability_exception: exception } });
}

export async function updateExceptionController(request: Request, response: Response) {
  const id = request.params['id'] as string;
  const body = request.body as UpdateExceptionBody;
  const currentUser = request.auth!.user;
  const exception = await updateAvailabilityException(id, body, currentUser);
  response.status(200).json({ data: { availability_exception: exception } });
}

export async function deleteExceptionController(request: Request, response: Response) {
  const id = request.params['id'] as string;
  const currentUser = request.auth!.user;
  await deleteAvailabilityException(id, currentUser);
  response.status(200).json({ data: { deleted: true } });
}
