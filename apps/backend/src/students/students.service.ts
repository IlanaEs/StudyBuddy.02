import { AppError } from '../errors/AppError.js';
import {
  findStudentByUserId,
  getStudentProfileByUserId,
  insertChildProfile,
  insertStudentProfile,
} from './students.repository.js';
import type { CreateStudentProfileBody } from './students.validation.js';

export interface CreateStudentProfileResult {
  student_id: string;
}

export interface MyStudentProfile {
  student_id: string;
  full_name: string;
  grade_level: string | null;
}

// Bootstrap/gate for the Quick Matching Wizard. A student with no profile row
// (registration genuinely incomplete) → clean 404, never a 500. This is the
// profile check the wizard uses INSTEAD of /student-intakes/me/latest.
export async function getMyStudentProfile(userId: string): Promise<MyStudentProfile> {
  const profile = await getStudentProfileByUserId(userId);
  if (!profile) {
    throw new AppError('No student profile found', 404);
  }
  return { student_id: profile.id, full_name: profile.full_name, grade_level: profile.grade_level };
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
