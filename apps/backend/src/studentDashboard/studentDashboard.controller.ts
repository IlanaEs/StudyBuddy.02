import type { Request, Response } from 'express';

import { getStudentDashboardService } from './studentDashboard.service.js';

export async function getStudentDashboardController(request: Request, response: Response) {
  const currentUser = request.auth!.user;

  const dashboard = await getStudentDashboardService(currentUser);

  response.status(200).json({ data: dashboard });
}
