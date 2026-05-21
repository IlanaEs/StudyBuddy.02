import type { Request, Response } from 'express';

import {
  createAvailabilitySlot,
  deactivateAvailabilitySlot,
  generateAvailableSlots,
  getMyAvailability,
  updateAvailabilitySlot,
} from './teacherAvailability.service.js';
import type {
  CreateAvailabilitySlotBody,
  GetAvailableSlotsQuery,
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

export async function getAvailableSlotsController(request: Request, response: Response) {
  const teacherId = request.params['teacherId'] as string;
  const query = request.query as unknown as GetAvailableSlotsQuery;

  const result = await generateAvailableSlots(teacherId, query.date, query.duration_minutes);

  // Serialize to snake_case to match the documented response shape.
  response.status(200).json({
    data: {
      teacher_id: result.teacherId,
      date: result.date,
      lesson_duration_minutes: result.lessonDurationMinutes,
      break_duration_minutes: result.breakDurationMinutes,
      slot_alignment: result.slotAlignment,
      available_slots: result.availableSlots.map((s) => ({
        start_at: s.startAt,
        end_at: s.endAt,
      })),
    },
  });
}
