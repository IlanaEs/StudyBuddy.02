// DB access only. No business logic. No validation.

import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import type { CreateIntakeInput, StudentIntakeSummary } from './studentIntakes.types.js';

const adminClient = createSupabaseAdminClient;

export async function findSubjectIdByName(subjectName: string): Promise<string | null> {
  const normalizedName = subjectName.trim();
  const { data, error } = await adminClient()
    .from('subjects')
    .select('id')
    .ilike('name', normalizedName)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to resolve subject', 500);
  }

  return (data?.id as string) ?? null;
}

export async function createStudentIntake(
  input: CreateIntakeInput,
): Promise<StudentIntakeSummary> {
  const { data, error } = await adminClient()
    .from('student_intakes')
    .insert({
      student_id: input.studentId,
      subject_id: input.subjectId,
      created_by_user_id: input.createdByUserId,
      level: input.level,
      goal: input.goal,
      location_preference: input.locationPreference,
      city: input.city,
      budget_min: input.budgetMin,
      budget_max: input.budgetMax,
      preferred_days: input.preferredDays,
      preferred_time_ranges: input.preferredTimeRanges,
      learning_style: input.learningStyle,
      urgency: input.urgency,
      status: 'open',
    })
    .select('id,student_id,subject_id,status')
    .single();

  if (error) {
    throw new AppError('Failed to create student intake', 500);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    subjectId: row.subject_id as string,
    status: row.status as 'open' | 'matched' | 'closed',
  };
}

export async function getStudentIntakeById(
  intakeId: string,
): Promise<StudentIntakeSummary | null> {
  const { data, error } = await adminClient()
    .from('student_intakes')
    .select('id,student_id,subject_id,status')
    .eq('id', intakeId)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to load student intake', 500);
  }

  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    subjectId: row.subject_id as string,
    status: row.status as 'open' | 'matched' | 'closed',
  };
}
