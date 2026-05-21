import type { Request, Response } from 'express';

import {
  createAvailabilitySlot,
  deactivateAvailabilitySlot,
  getMyAvailability,
  updateAvailabilitySlot,
} from './teacherAvailability.service.js';
import type {
  CreateAvailabilitySlotBody,
  UpdateAvailabilitySlotBody,
} from './teacherAvailability.validation.js';

export async function getMyAvailabilityController(request: Request, response: Response) {
  const currentUser = request.auth!.user;
  const slots = await getMyAvailability(currentUser);
  response.status(200).json({ data: { availability_slots: slots } });
}

export async function createAvailabilitySlotController(request: Request, response: Response) {
  const body = request.body as CreateAvailabilitySlotBody;
  const currentUser = request.auth!.user;
  const slot = await createAvailabilitySlot(body, currentUser);
  response.status(201).json({ data: { availability_slot: slot } });
}

export async function updateAvailabilitySlotController(request: Request, response: Response) {
  const id = request.params['id'] as string;
  const body = request.body as UpdateAvailabilitySlotBody;
  const currentUser = request.auth!.user;
  const slot = await updateAvailabilitySlot(id, body, currentUser);
  response.status(200).json({ data: { availability_slot: slot } });
}

export async function deactivateAvailabilitySlotController(request: Request, response: Response) {
  const id = request.params['id'] as string;
  const currentUser = request.auth!.user;
  const slot = await deactivateAvailabilitySlot(id, currentUser);
  response.status(200).json({ data: { availability_slot: slot } });
}
