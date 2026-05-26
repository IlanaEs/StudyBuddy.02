import type { Request, Response } from 'express';

import {
  approveLessonConfirmationService,
  getParentDashboardService,
  updateHomeworkTaskStatusService,
} from './parentDashboard.service.js';
import type { GetDashboardQuery, UpdateHomeworkTaskBody } from './parentDashboard.validation.js';

export async function getDashboardController(request: Request, response: Response) {
  const query = request.query as unknown as GetDashboardQuery;
  const currentUser = request.auth!.user;

  const dashboard = await getParentDashboardService(currentUser, query.studentId);

  response.status(200).json({ data: dashboard });
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
