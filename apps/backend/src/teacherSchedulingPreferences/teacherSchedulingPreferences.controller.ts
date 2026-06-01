import type { Request, Response } from 'express';

import {
  getSchedulingPreferences,
  updateSchedulingPreferences,
} from './teacherSchedulingPreferences.service.js';
import type {
  GetSchedulingPreferencesQuery,
  UpdateSchedulingPreferencesBody,
} from './teacherSchedulingPreferences.validation.js';

export async function getSchedulingPreferencesController(request: Request, response: Response) {
  const currentUser = request.auth!.user;
  const query = request.query as unknown as GetSchedulingPreferencesQuery;
  const prefs = await getSchedulingPreferences(currentUser, query);
  response.status(200).json({ data: { scheduling_preferences: prefs } });
}

export async function updateSchedulingPreferencesController(request: Request, response: Response) {
  const currentUser = request.auth!.user;
  const body = request.body as UpdateSchedulingPreferencesBody;
  const prefs = await updateSchedulingPreferences(currentUser, body);
  response.status(200).json({ data: { scheduling_preferences: prefs } });
}
