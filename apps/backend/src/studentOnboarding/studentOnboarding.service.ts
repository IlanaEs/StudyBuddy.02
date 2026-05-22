import type { UserRole } from '../auth/authTypes.js';
import { AppError } from '../errors/AppError.js';
import {
  createChildProfile,
  createStudentIntake,
  createStudentProfile,
  findOrCreateSubjectByName,
} from './studentOnboarding.repository.js';
import type { CreateStudentOnboardingInput, StudentOnboardingResult } from './studentOnboarding.types.js';

export async function initStudentOnboarding(
  userId: string,
  role: UserRole,
  input: CreateStudentOnboardingInput,
): Promise<StudentOnboardingResult> {
  if (role !== 'student' && role !== 'parent') {
    throw new AppError('Student onboarding is only available for student and parent accounts', 403);
  }

  const subjectId = await findOrCreateSubjectByName(input.subject_name);

  let studentId: string;
  if (role === 'parent') {
    if (!input.child_name) {
      throw new AppError('child_name is required for parent onboarding', 422);
    }
    studentId = await createChildProfile(userId, input.child_name, input.grade_level ?? null);
  } else {
    studentId = await createStudentProfile(userId, input.full_name, input.grade_level ?? null);
  }

  const intakeId = await createStudentIntake(studentId, userId, subjectId, {
    level: input.sub_level,
    goal: input.learning_goal ?? null,
    location_preference: input.location_preference,
    city: input.city,
    budget_min: input.budget_min ?? null,
    budget_max: input.budget_max ?? null,
    preferred_days: input.preferred_days,
    preferred_time_ranges: input.preferred_time_ranges,
    learning_style: input.learning_style,
    soft_preferences: input.soft_preferences,
  });

  return { student_id: studentId, intake_id: intakeId };
}
