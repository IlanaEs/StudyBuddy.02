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
    throw new AppError('Student profiles are only created for student and parent accounts', 403);
  }
  if (body.account_type === 'independent_student' && role !== 'student') {
    throw new AppError('החשבון המחובר לא מתאים למסלול שנבחר.', 403);
  }
  if (body.account_type === 'parent_for_child' && role !== 'parent') {
    throw new AppError('החשבון המחובר לא מתאים למסלול שנבחר.', 403);
  }

  // Idempotent: return existing profile if one already exists for this user
  const existingId = await findStudentByUserId(userId);
  if (existingId) return { student_id: existingId };

  let studentId: string;
  if (body.account_type === 'parent_for_child') {
    if (!body.child_name) {
      throw new AppError('child_name is required for parent accounts', 422);
    }
    studentId = await insertChildProfile(userId, body.child_name, body.grade_level ?? null);
  } else {
    if (!body.full_name) {
      throw new AppError('full_name is required for independent student accounts', 422);
    }
    studentId = await insertStudentProfile(userId, body.full_name, body.grade_level ?? null);
  }

  return { student_id: studentId };
}
