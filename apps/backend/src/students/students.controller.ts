import type { Request, Response } from 'express';

import { ensureStudentProfile } from './students.service.js';

export async function createStudentProfileController(request: Request, response: Response) {
  const { id: userId, role } = request.auth!.user;
  const result = await ensureStudentProfile(userId, role, request.body);
  response.status(201).json({ data: result });
}
