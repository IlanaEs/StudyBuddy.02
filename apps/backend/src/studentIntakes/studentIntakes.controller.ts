import type { Request, Response } from 'express';

import { createIntake } from './studentIntakes.service.js';
import type { CreateIntakeBody } from './studentIntakes.validation.js';

export async function createIntakeController(request: Request, response: Response) {
  const body = request.body as CreateIntakeBody;
  const currentUser = request.auth!.user;

  const intake = await createIntake(body, currentUser);

  response.status(201).json({ data: intake });
}
