import type { Request, Response } from 'express';

import { initStudentOnboarding } from './studentOnboarding.service.js';

export async function initStudentOnboardingController(request: Request, response: Response) {
  const user = request.auth!.user;
  const result = await initStudentOnboarding(user.id, user.role, request.body);
  response.status(201).json({ data: result });
}
