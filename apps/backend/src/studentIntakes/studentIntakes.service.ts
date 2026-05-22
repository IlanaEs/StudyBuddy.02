import { AppError } from '../errors/AppError.js';
import {
  findOrCreateSubjectByName,
  findStudentIdForUser,
  insertStudentIntake,
} from './studentIntakes.repository.js';
import type { CreateStudentIntakeBody } from './studentIntakes.validation.js';

export interface CreateStudentIntakeResult {
  intake_id: string;
}

export async function createStudentIntake(
  userId: string,
  body: CreateStudentIntakeBody,
): Promise<CreateStudentIntakeResult> {
  const studentId = await findStudentIdForUser(userId);
  if (!studentId) {
    throw new AppError('Student profile not found. Complete account setup first.', 422);
  }

  const subjectId = await findOrCreateSubjectByName(body.subject_name);

  const intakeId = await insertStudentIntake(studentId, userId, subjectId, {
    sub_level: body.sub_level,
    learning_goal: body.learning_goal ?? null,
    location_preference: body.location_preference,
    city: body.city,
    budget_min: body.budget_min ?? null,
    budget_max: body.budget_max ?? null,
    preferred_days: body.preferred_days,
    preferred_time_ranges: body.preferred_time_ranges,
    learning_style: body.learning_style,
  });

  return { intake_id: intakeId };
}
