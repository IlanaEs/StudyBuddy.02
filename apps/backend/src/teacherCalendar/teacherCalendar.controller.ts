import type { Request, Response } from 'express';

import { env } from '../config/env.js';
import {
  buildConnectUrl,
  disconnectService,
  getBusySlotsService,
  getStatusService,
  handleCallback,
  syncService,
} from './teacherCalendar.service.js';

const ONBOARDING_PATH = '/teacher-onboarding';

function frontendRedirect(result: 'connected' | 'failed'): string {
  return `${env.FRONTEND_ORIGIN}${ONBOARDING_PATH}?calendar=${result}`;
}

// GET /api/teachers/me/calendar/connect (authenticated)
// Returns the Google OAuth URL for the frontend to navigate to.
export async function connectCalendarController(request: Request, response: Response) {
  const userId = request.auth!.user.id;
  const url = buildConnectUrl(userId);
  response.json({ data: { url } });
}

// GET /api/teachers/me/calendar/callback (UNauthenticated — browser redirect from Google)
// Identity is carried in the signed `state` param, not an auth header.
export async function calendarCallbackController(request: Request, response: Response) {
  const code = typeof request.query['code'] === 'string' ? request.query['code'] : null;
  const state = typeof request.query['state'] === 'string' ? request.query['state'] : null;
  const oauthError = typeof request.query['error'] === 'string' ? request.query['error'] : null;

  if (oauthError || !code || !state) {
    response.redirect(frontendRedirect('failed'));
    return;
  }

  try {
    await handleCallback(code, state);
    response.redirect(frontendRedirect('connected'));
  } catch {
    response.redirect(frontendRedirect('failed'));
  }
}

// GET /api/teachers/me/calendar/status (authenticated) — source of truth.
export async function getCalendarStatusController(request: Request, response: Response) {
  const data = await getStatusService(request.auth!.user.id);
  response.json({ data });
}

// GET /api/teachers/me/calendar/busy-slots (authenticated)
export async function getBusySlotsController(request: Request, response: Response) {
  const data = await getBusySlotsService(request.auth!.user.id);
  response.json({ data });
}

// POST /api/teachers/me/calendar/disconnect (authenticated)
export async function disconnectCalendarController(request: Request, response: Response) {
  const data = await disconnectService(request.auth!.user.id);
  response.json({ data });
}

// POST /api/teachers/me/calendar/sync (authenticated) — re-sync via stored refresh token.
export async function syncCalendarController(request: Request, response: Response) {
  const data = await syncService(request.auth!.user.id);
  response.json({ data });
}
