import type { Request, Response } from 'express';

import { ensureStudentProfile, getMyStudentProfile } from './students.service.js';

export async function createStudentProfileController(request: Request, response: Response) {
  const { id: userId, role } = request.auth!.user;
  const result = await ensureStudentProfile(userId, role, request.body);
  response.status(201).json({ data: result });
}

// GET /api/students/me — { student_id, full_name, grade_level } or 404 (no profile).
export async function getMyStudentProfileController(request: Request, response: Response) {
  const result = await getMyStudentProfile(request.auth!.user.id);
  response.status(200).json({ data: result });
}
