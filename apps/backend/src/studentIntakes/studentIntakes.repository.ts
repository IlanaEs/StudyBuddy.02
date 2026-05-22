import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';

const adminClient = createSupabaseAdminClient;

export async function findOrCreateSubjectByName(name: string): Promise<string> {
  const { data: existing, error: selectError } = await adminClient()
    .from('subjects')
    .select('id')
    .eq('name', name)
    .maybeSingle();

  if (selectError) throw new AppError('Unable to query subjects', 500);
  if (existing) return existing.id as string;

  const { data: created, error: insertError } = await adminClient()
    .from('subjects')
    .insert({ name, is_active: true })
    .select('id')
    .single();

  if (insertError || !created) throw new AppError('Unable to create subject', 500);
  return created.id as string;
}

export async function findStudentIdForUser(userId: string): Promise<string | null> {
  const { data, error } = await adminClient()
    .from('students')
    .select('id')
    .or(`user_id.eq.${userId},parent_user_id.eq.${userId}`)
    .maybeSingle();

  if (error) throw new AppError('Unable to query students', 500);
  return (data?.id as string) ?? null;
}

export async function insertStudentIntake(
  studentId: string,
  createdByUserId: string,
  subjectId: string,
  payload: {
    sub_level: string;
    learning_goal: string | null;
    location_preference: string;
    city: string;
    budget_min: number | null;
    budget_max: number | null;
    preferred_days: string[];
    preferred_time_ranges: string[];
    learning_style: string[];
  },
): Promise<string> {
  const { data, error } = await adminClient()
    .from('student_intakes')
    .insert({
      student_id: studentId,
      created_by_user_id: createdByUserId,
      subject_id: subjectId,
      level: payload.sub_level || null,
      goal: payload.learning_goal || null,
      location_preference: payload.location_preference,
      city: payload.city || null,
      budget_min: payload.budget_min,
      budget_max: payload.budget_max,
      preferred_days: payload.preferred_days,
      preferred_time_ranges: payload.preferred_time_ranges,
      learning_style: payload.learning_style.join(',') || null,
      status: 'open',
    })
    .select('id')
    .single();

  if (error || !data) throw new AppError('Unable to create student intake', 500);
  return data.id as string;
}
