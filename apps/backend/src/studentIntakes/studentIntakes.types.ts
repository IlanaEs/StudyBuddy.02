// Sacred Naming: TypeScript types use camelCase; DB field names remain snake_case.

export type StudentIntakeStatus = 'open' | 'matched' | 'closed';

export type PreferredTimeRange = {
  start: string; // HH:MM
  end: string;   // HH:MM
};

// Structured soft preferences (quick wizard). Captured + pre-filled; matching ignores it.
export type SoftCriteria = {
  teacher_gender?: 'female' | 'male' | null;
  fast_pace?: boolean;
  adhd_experience?: boolean;
  inclusive_approach?: boolean;
};

// Input shape for the repository insert function (all normalization already applied).
export type CreateIntakeInput = {
  studentId: string;
  subjectId: string;
  level: string | null;
  goal: string | null;
  locationPreference: 'online' | 'frontal' | 'both';
  city: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  preferredDays: number[] | null;          // 0–6, duplicates removed, sorted
  preferredTimeRanges: PreferredTimeRange[] | null;
  learningStyle: string | null;
  urgency: string | null;
  softCriteria: SoftCriteria | null;
  createdByUserId: string;
};

// Prefill payload for the quick wizard (snake_case API contract).
export type LatestIntakePrefill = {
  student_id: string;
  subject_name: string | null;
  level: string | null;
  goal: string | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_days: number[] | null;
  preferred_time_ranges: PreferredTimeRange[] | null;
  soft_criteria: SoftCriteria | null;
};

// Subset of columns returned after creation (sufficient for the API response).
export type StudentIntakeSummary = {
  id: string;
  studentId: string;
  subjectId: string;
  status: StudentIntakeStatus;
};
