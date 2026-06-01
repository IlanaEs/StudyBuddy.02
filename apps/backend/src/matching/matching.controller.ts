import type { Request, Response } from 'express';

import { runMatching } from './matching.service.js';

export async function runMatchingController(request: Request, response: Response) {
  const intakeId = request.params['intakeId'] as string;
  const currentUser = request.auth!.user;

  const result = await runMatching(intakeId, currentUser);

  response.status(200).json({ data: result });
}
