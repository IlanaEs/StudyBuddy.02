import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';

const adminClient = createSupabaseAdminClient;

export async function findStudentByUserId(userId: string): Promise<string | null> {
  const { data, error } = await adminClient()
    .from('students')
    .select('id')
    .or(`user_id.eq.${userId},parent_user_id.eq.${userId}`)
    .maybeSingle();

  if (error) throw new AppError('Unable to query students', 500);
  return (data?.id as string) ?? null;
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

  if (error || !data) throw new AppError('Unable to create student profile', 500);
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
