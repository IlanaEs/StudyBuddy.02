import type { Request, Response } from 'express';

import {
  approveLessonConfirmationService,
  createParentChildService,
  getChildScheduleService,
  getParentChildrenService,
  getParentDashboardService,
  updateHomeworkTaskStatusService,
} from './parentDashboard.service.js';
import type {
  CreateChildBody,
  GetChildScheduleQuery,
  GetDashboardQuery,
  UpdateHomeworkTaskBody,
} from './parentDashboard.validation.js';

export async function getDashboardController(request: Request, response: Response) {
  const query = request.query as unknown as GetDashboardQuery;
  const currentUser = request.auth!.user;

  const dashboard = await getParentDashboardService(currentUser, query.studentId);

  response.status(200).json({ data: dashboard });
}

export async function getChildrenController(request: Request, response: Response) {
  const currentUser = request.auth!.user;
  const children = await getParentChildrenService(currentUser);
  response.status(200).json({ data: { children } });
}

export async function createChildController(request: Request, response: Response) {
  const currentUser = request.auth!.user;
  const body = request.body as CreateChildBody;
  const child = await createParentChildService(currentUser, body);
  response.status(201).json({ data: { child } });
}

export async function getChildScheduleController(request: Request, response: Response) {
  const currentUser = request.auth!.user;
  const childId = request.params['childId'] as string;
  const query = request.query as unknown as GetChildScheduleQuery;

  const schedule = await getChildScheduleService(currentUser, childId, query.from, query.to);

  response.status(200).json({ data: schedule });
}

export async function approveLessonConfirmationController(request: Request, response: Response) {
  const id = request.params['id'] as string;
  const currentUser = request.auth!.user;

  const confirmation = await approveLessonConfirmationService(id, currentUser);

  response.status(200).json({ data: { confirmation } });
}

export async function updateHomeworkTaskController(request: Request, response: Response) {
  const id = request.params['id'] as string;
  const body = request.body as UpdateHomeworkTaskBody;
  const currentUser = request.auth!.user;

  const task = await updateHomeworkTaskStatusService(id, body, currentUser);

  response.status(200).json({ data: { task } });
}
