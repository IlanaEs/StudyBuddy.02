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
  full_name: string;
  grade_level?: string | null;
  child_name?: string;
}

export interface CreateStudentIntakeInput {
  subject_name: string;
  sub_level?: string;
  learning_goal?: string | null;
  location_preference: 'online' | 'frontal' | 'both';
  city?: string;
  budget_min?: number | null;
  budget_max?: number | null;
  preferred_days?: string[];
  preferred_time_ranges?: string[];
  learning_style?: string[];
}

export async function completeOAuthSignup(
  role: 'student' | 'parent',
  fullName: string,
  accessToken: string,
): Promise<ApiResponse<OAuthSignupResult>> {
  return apiRequest<OAuthSignupResult>(
    '/auth/complete-oauth-signup',
    {
      method: 'POST',
      body: JSON.stringify({ role, full_name: fullName }),
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
