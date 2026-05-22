// Sacred Naming: TypeScript types use camelCase; DB field names remain snake_case.

export type StudentIntakeStatus = 'open' | 'matched' | 'closed';

export type PreferredTimeRange = {
  start: string; // HH:MM
  end: string;   // HH:MM
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
  createdByUserId: string;
};

// Subset of columns returned after creation (sufficient for the API response).
export type StudentIntakeSummary = {
  id: string;
  studentId: string;
  subjectId: string;
  status: StudentIntakeStatus;
};
