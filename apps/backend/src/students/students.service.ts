import { AppError } from '../errors/AppError.js';
import { findStudentByUserId, insertChildProfile, insertStudentProfile } from './students.repository.js';
import type { CreateStudentProfileBody } from './students.validation.js';

export interface CreateStudentProfileResult {
  student_id: string;
}

export async function ensureStudentProfile(
  userId: string,
  role: string,
  body: CreateStudentProfileBody,
): Promise<CreateStudentProfileResult> {
  if (role !== 'student' && role !== 'parent') {
    throw new AppError('החשבון המחובר לא מתאים למסלול שנבחר.', 403);
  }

  const expectedRole = body.account_type === 'parent_for_child' ? 'parent' : 'student';
  if (role !== expectedRole) {
    throw new AppError('החשבון המחובר לא מתאים למסלול שנבחר.', 403);
  }

  // Idempotent: return existing profile if one already exists for this user
  const existingId = await findStudentByUserId(userId);
  if (existingId) return { student_id: existingId };

  let studentId: string;
  if (role === 'parent') {
    if (!body.child_name) {
      throw new AppError('child_name is required for parent accounts', 422);
    }
    studentId = await insertChildProfile(userId, body.child_name, body.grade_level ?? null);
  } else {
    studentId = await insertStudentProfile(userId, body.full_name ?? '', body.grade_level ?? null);
  }

  return { student_id: studentId };
}
