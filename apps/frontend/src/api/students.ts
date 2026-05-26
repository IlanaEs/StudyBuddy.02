import { apiRequest } from './client';
import type { ApiResponse } from './client';

export type OAuthSignupResult = {
  user: {
    id: string;
    email: string;
    role: string;
    full_name: string;
    status: string;
  };
};

export type CreateStudentProfileResult = {
  student_id: string;
};

export type CreateStudentIntakeResult = {
  intake_id: string;
};

export interface CreateStudentProfileInput {
  account_type: 'independent_student' | 'parent_for_child';
  full_name?: string;
  grade_level?: string | null;
  child_name?: string;
}

export interface CreateStudentIntakeInput {
  student_id: string;
  subject_id?: string;
  subject_name?: string;
  sub_level?: string;
  learning_goal?: string | null;
  location_preference: 'online' | 'frontal' | 'both';
  city?: string;
  budget_min?: number | null;
  budget_max?: number | null;
  preferred_days?: number[];
  preferred_time_ranges?: Array<{ start: string; end: string }>;
  learning_style?: string | null;
}

export async function completeOAuthSignup(
  accountType: 'independent_student' | 'parent_for_child',
  fullName: string,
  accessToken: string,
): Promise<ApiResponse<OAuthSignupResult>> {
  return apiRequest<OAuthSignupResult>(
    '/auth/complete-oauth-signup',
    {
      method: 'POST',
      body: JSON.stringify({ account_type: accountType, full_name: fullName }),
    },
    accessToken,
  );
}

export async function createStudentProfile(
  input: CreateStudentProfileInput,
  accessToken: string,
): Promise<ApiResponse<CreateStudentProfileResult>> {
  return apiRequest<CreateStudentProfileResult>(
    '/api/students',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    accessToken,
  );
}

export async function createStudentIntake(
  input: CreateStudentIntakeInput,
  accessToken: string,
): Promise<ApiResponse<CreateStudentIntakeResult>> {
  return apiRequest<CreateStudentIntakeResult>(
    '/api/student-intakes',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    accessToken,
  );
}
