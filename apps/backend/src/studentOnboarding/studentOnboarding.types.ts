export interface CreateStudentOnboardingInput {
  full_name: string;
  grade_level: string | null;
  sub_level: string;
  subject_name: string;
  learning_goal: string | null;
  location_preference: 'online' | 'frontal' | 'both';
  city: string;
  budget_min: number | null;
  budget_max: number | null;
  preferred_days: string[];
  preferred_time_ranges: string[];
  learning_style: string[];
  soft_preferences: string[];
  child_name?: string;
}

export interface StudentOnboardingResult {
  student_id: string;
  intake_id: string;
}
