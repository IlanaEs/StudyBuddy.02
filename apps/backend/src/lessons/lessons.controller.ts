import type { Request, Response } from 'express';

import { AppError } from '../errors/AppError.js';
import {
  getMyLessonsService,
  updateLessonStatusService,
  completeLessonService,
  addLessonToStudentCalendarService,
  syncLessonToTeacherCalendarService,
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

export async function addLessonToCalendarController(request: Request, response: Response) {
  const id = request.params['id'] as string;
  const currentUser = request.auth!.user;

  const providerToken = request.headers['x-provider-token'];
  if (!providerToken || typeof providerToken !== 'string' || !providerToken.trim()) {
    throw new AppError('חסר חיבור ל-Google. התחבר/י ליומן ונסה/י שוב.', 400);
  }

  const result = await addLessonToStudentCalendarService(id, currentUser, providerToken.trim());

  response.status(200).json({ data: result });
}

export async function syncLessonCalendarController(request: Request, response: Response) {
  const id = request.params['id'] as string;
  const currentUser = request.auth!.user;

  const providerToken = request.headers['x-provider-token'];
  if (!providerToken || typeof providerToken !== 'string' || !providerToken.trim()) {
    throw new AppError('חסר חיבור ל-Google Calendar. חברו את היומן ונסו שוב.', 400);
  }

  const result = await syncLessonToTeacherCalendarService(id, currentUser, providerToken.trim());

  response.status(200).json({ data: result });
}
