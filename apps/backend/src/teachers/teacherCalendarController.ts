import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import {
  getCalendarDraftFields,
  saveCalendarSync,
  clearCalendarData,
} from './teacherCalendarRepository.js';
import { fetchGoogleBusySlots } from './teacherCalendarService.js';

export async function getCalendarStatusController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.auth!.user.id;
    const fields = await getCalendarDraftFields(userId);

    const status = fields?.connected ? 'connected' : 'not_connected';
    const lastSyncedAt = fields?.lastSyncedAt ?? null;

    res.status(200).json({ data: { status, lastSyncedAt } });
  } catch (err) {
    next(err);
  }
}

export async function syncCalendarController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.auth!.user.id;
    const providerToken = req.headers['x-provider-token'];

    if (process.env['NODE_ENV'] !== 'production') {
      console.debug('[syncCalendarController]', {
        hasXProviderToken: !!providerToken,
        tokenType: typeof providerToken,
        tokenLength: typeof providerToken === 'string' ? providerToken.length : 0,
      });
    }

    if (!providerToken || typeof providerToken !== 'string') {
      throw new AppError('Missing Google provider token — X-Provider-Token header not received', 400);
    }

    const today = new Date();
    const fromParam = typeof req.query['from'] === 'string' ? req.query['from'] : null;
    const toParam = typeof req.query['to'] === 'string' ? req.query['to'] : null;

    const from = fromParam ?? today.toISOString().slice(0, 10);
    const toDate = new Date(today);
    toDate.setDate(toDate.getDate() + 90);
    const to = toParam ?? toDate.toISOString().slice(0, 10);

    const busySlots = await fetchGoogleBusySlots(providerToken, from, to);
    await saveCalendarSync(userId, busySlots);

    const syncedAt = new Date().toISOString();

    res.status(200).json({ data: { busySlots, syncedAt } });
  } catch (err) {
    next(err);
  }
}

export async function disconnectCalendarController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.auth!.user.id;
    await clearCalendarData(userId);
    res.status(200).json({ data: { disconnected: true } });
  } catch (err) {
    next(err);
  }
}

export async function getBusySlotsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.auth!.user.id;
    const fields = await getCalendarDraftFields(userId);
    const busySlots = fields?.busySlots ?? [];
    res.status(200).json({ data: { busySlots } });
  } catch (err) {
    next(err);
  }
}
