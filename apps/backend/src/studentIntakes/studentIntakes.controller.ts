import type { Request, Response } from 'express';

import { createStudentIntake } from './studentIntakes.service.js';

export async function createStudentIntakeController(request: Request, response: Response) {
  const result = await createStudentIntake(request.auth!.user.id, request.body);
  response.status(201).json({ data: result });
}
