import type { Request, Response } from 'express';

import {
  getMyLessonsService,
  updateLessonStatusService,
  completeLessonService,
} from './lessons.service.js';
import type { UpdateLessonStatusBody, CompleteLessonBody } from './lessons.validation.js';

export async function getMyLessonsController(request: Request, response: Response) {
  const currentUser = request.auth!.user;
  const lessons = await getMyLessonsService(currentUser);
  response.status(200).json({ data: { lessons } });
}

export async function updateLessonStatusController(request: Request, response: Response) {
  const id = request.params['id'] as string;
  const body = request.body as UpdateLessonStatusBody;
  const currentUser = request.auth!.user;

  const lesson = await updateLessonStatusService(id, body, currentUser);

  response.status(200).json({ data: { lesson } });
}

export async function completeLessonController(request: Request, response: Response) {
  const id = request.params['id'] as string;
  const body = request.body as CompleteLessonBody;
  const currentUser = request.auth!.user;

  const result = await completeLessonService(id, body, currentUser);

  response.status(200).json({ data: result });
}
