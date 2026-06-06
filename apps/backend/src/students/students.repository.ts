import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';

const adminClient = createSupabaseAdminClient;

export async function findStudentByUserId(userId: string): Promise<string | null> {
  // limit(1) + order (NOT maybeSingle): a user can end up with >1 students row
  // from a signup race; maybeSingle would 500 on multiple rows. Take the
  // earliest (the original profile) so reads stay resilient to duplicates.
  const { data, error } = await adminClient()
    .from('students')
    .select('id')
    .or(`user_id.eq.${userId},parent_user_id.eq.${userId}`)
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    console.error('[findStudentByUserId]', error);
    throw new AppError('Unable to query students', 500);
  }
  return (data?.[0]?.id as string) ?? null;
}

export interface StudentProfileRow {
  id: string;
  full_name: string;
  grade_level: string | null;
}

// The authenticated student's own profile row (student-owned via user_id).
// Used by GET /api/students/me to bootstrap the Quick Matching Wizard without
// depending on the intakes endpoint.
export async function getStudentProfileByUserId(userId: string): Promise<StudentProfileRow | null> {
  // limit(1) + order, NOT maybeSingle — see findStudentByUserId. A signup race
  // can leave >1 row for a user_id; maybeSingle would 500. Return the earliest.
  const { data, error } = await adminClient()
    .from('students')
    .select('id,full_name,grade_level')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    console.error('[getStudentProfileByUserId]', error);
    throw new AppError('Unable to query student profile', 500);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = (data?.[0] as any) ?? null;
  if (!row) return null;
  return {
    id: row.id as string,
    full_name: row.full_name as string,
    grade_level: (row.grade_level as string | null) ?? null,
  };
}

export async function insertStudentProfile(
  userId: string,
  fullName: string,
  gradeLevel: string | null,
): Promise<string> {
  const { data, error } = await adminClient()
    .from('students')
    .insert({ user_id: userId, full_name: fullName, grade_level: gradeLevel ?? null })
    .select('id')
    .single();

  if (error || !data) {
    // Idempotent under the students_user_id_unique index (migration 021): a
    // concurrent insert / re-onboarding that loses the race gets a unique
    // violation — resolve it to the existing row instead of failing. This makes
    // duplicate creation impossible even under the signup race that produced it.
    if (error?.code === '23505') {
      const existing = await findStudentByUserId(userId);
      if (existing) return existing;
    }
    console.error('[insertStudentProfile]', error);
    throw new AppError('Unable to create student profile', 500);
  }
  return data.id as string;
}

export async function insertChildProfile(
  parentUserId: string,
  childName: string,
  gradeLevel: string | null,
): Promise<string> {
  const { data, error } = await adminClient()
    .from('students')
    .insert({ parent_user_id: parentUserId, full_name: childName, grade_level: gradeLevel ?? null })
    .select('id')
    .single();

  if (error || !data) throw new AppError('Unable to create child student profile', 500);
  return data.id as string;
}
