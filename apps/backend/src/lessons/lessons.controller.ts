import type { Request, Response } from 'express';

import { updateLessonStatusService } from './lessons.service.js';
import type { UpdateLessonStatusBody } from './lessons.validation.js';

export async function updateLessonStatusController(request: Request, response: Response) {
  const id = request.params['id'] as string;
  const body = request.body as UpdateLessonStatusBody;
  const currentUser = request.auth!.user;

  const lesson = await updateLessonStatusService(id, body, currentUser);

  response.status(200).json({ data: { lesson } });
}
