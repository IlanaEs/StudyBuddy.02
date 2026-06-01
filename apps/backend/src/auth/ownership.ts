import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import type { UserRole } from './authTypes.js';

const adminClient = createSupabaseAdminClient;

/**
 * Asserts that currentUser is authorized to act on behalf of studentId.
 *
 * Rules:
 *   admin  → always allowed
 *   student → allowed only when students.user_id = currentUserId
 *   parent  → allowed only when students.parent_user_id = currentUserId
 *   teacher → never allowed (teachers do not own students)
 *
 * Throws AppError(403) on access denial, AppError(404) if the student row is missing.
 */
export async function assertStudentAccess(
  currentUserId: string,
  currentUserRole: UserRole,
  studentId: string,
): Promise<void> {
  if (currentUserRole === 'admin') return;

  const { data: student, error } = await adminClient()
    .from('students')
    .select('user_id,parent_user_id')
    .eq('id', studentId)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to verify student access', 500);
  }

  if (!student) {
    throw new AppError('Student not found', 404);
  }

  if (currentUserRole === 'student') {
    if (student.user_id !== currentUserId) {
      throw new AppError('Forbidden', 403);
    }
    return;
  }

  if (currentUserRole === 'parent') {
    if (student.parent_user_id !== currentUserId) {
      throw new AppError('Forbidden', 403);
    }
    return;
  }

  throw new AppError('Forbidden', 403);
}
