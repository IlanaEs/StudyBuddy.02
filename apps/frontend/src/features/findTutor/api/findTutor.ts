import { apiRequest } from '../../../api/client';
import type { ApiResponse } from '../../../api/client';
import type { SoftCriteria } from '../../../api/students';

export type StudentProfile = {
  student_id: string;
  full_name: string;
  grade_level: string | null;
};

// GET /api/students/me — the Quick Wizard's bootstrap/gate. 200 → profile (so the
// wizard can run, using student_id). 404 → { error } → registration genuinely
// incomplete. This replaces /me/latest as the gate; /me/latest is prefill only.
export function getMyStudentProfile(token: string): Promise<ApiResponse<StudentProfile>> {
  return apiRequest('/api/students/me', undefined, token);
}

export type LatestIntakePrefill = {
  student_id: string;
  subject_name: string | null;
  level: string | null;
  goal: string | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_days: number[] | null;
  preferred_time_ranges: Array<{ start: string; end: string }> | null;
  soft_criteria: SoftCriteria | null;
};

// GET /api/student-intakes/me/latest — prefill source for the quick wizard.
// 200 → { student_id, intake } where intake is null for a profiled student with
// no prior search. A 404 (no student profile) comes back as { error } and means
// registration is genuinely incomplete.
export function getLatestIntake(
  token: string,
): Promise<ApiResponse<{ student_id: string; intake: LatestIntakePrefill | null }>> {
  return apiRequest('/api/student-intakes/me/latest', undefined, token);
}

// POST /api/academic-repository-requests — capture an off-taxonomy subject (never booked).
export function requestSubjectAddition(
  token: string,
  requestedName: string,
): Promise<ApiResponse<{ request: { id: string } }>> {
  return apiRequest(
    '/api/academic-repository-requests',
    { method: 'POST', body: JSON.stringify({ repository_type: 'subject', requested_name: requestedName }) },
    token,
  );
}
