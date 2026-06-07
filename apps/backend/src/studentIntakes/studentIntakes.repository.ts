// DB access only. No business logic. No validation.

import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import type {
  CreateIntakeInput,
  LatestIntakePrefill,
  PreferredTimeRange,
  SoftCriteria,
  StudentIntakeSummary,
} from './studentIntakes.types.js';

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
      custom_subject_text: input.customSubjectText,
      needs_manual_match: input.needsManualMatch,
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
      soft_criteria: input.softCriteria,
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
    subjectId: (row.subject_id as string | null) ?? null,
    status: row.status as 'open' | 'matched' | 'closed',
  };
}

// Resolves the standalone student's own row id by auth user id (for the quick wizard prefill).
export async function getStudentIdByUserId(userId: string): Promise<string | null> {
  const { data, error } = await adminClient()
    .from('students')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new AppError('Failed to load student profile', 500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any)?.id as string | null) ?? null;
}

// Most-recent intake for a student, with the subject name resolved — used to
// pre-fill the quick wizard so login/level/budget/etc. are not re-asked.
export async function getLatestStudentIntakeByStudentId(
  studentId: string,
): Promise<LatestIntakePrefill | null> {
  const { data, error } = await adminClient()
    .from('student_intakes')
    .select('student_id,level,goal,budget_min,budget_max,preferred_days,preferred_time_ranges,soft_criteria,subjects(name)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new AppError('Failed to load latest intake', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  // PostgREST embeds the to-one subjects relation as an object (or array on some setups).
  const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
  return {
    student_id: row.student_id as string,
    subject_name: (subject?.name as string | null) ?? null,
    level: (row.level as string | null) ?? null,
    goal: (row.goal as string | null) ?? null,
    budget_min: (row.budget_min as number | null) ?? null,
    budget_max: (row.budget_max as number | null) ?? null,
    preferred_days: (row.preferred_days as number[] | null) ?? null,
    preferred_time_ranges: (row.preferred_time_ranges as PreferredTimeRange[] | null) ?? null,
    soft_criteria: (row.soft_criteria as SoftCriteria | null) ?? null,
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
