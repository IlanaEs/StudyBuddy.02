// Sacred Naming: TypeScript type names follow camelCase; DB field names remain snake_case.

export type LocationType = 'online' | 'frontal' | 'both';
export type IntakeStatus = 'open' | 'matched' | 'closed';
export type UserStatus = 'active' | 'inactive' | 'blocked';

// Ordered from most-strict to most-permissive.
// The matching service attempts phases in this order and stops when enough results are found.
export type FallbackPhase =
  | 'strict'
  | 'budget_expansion'
  | 'online_fallback'
  | 'partial_results';

export type PreferredTimeRange = {
  start: string; // HH:MM
  end: string;   // HH:MM
};

export type IntakeWithContext = {
  id: string;
  studentId: string;
  createdByUserId: string;
  subjectId: string;
  level: string | null;
  goal: string | null;
  locationPreference: LocationType;
  city: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  preferredDays: number[] | null;             // day_of_week 0–6; null = any day
  preferredTimeRanges: PreferredTimeRange[] | null; // null = any time
  learningStyle: string | null;
  urgency: string | null;
  status: IntakeStatus;
};

export type AvailabilitySlot = {
  dayOfWeek: number;  // 0 = Sunday … 6 = Saturday
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
  isActive: boolean;
};

// One row from teacher_subjects for this subject_id.
// A teacher may teach the same subject at multiple levels.
export type SubjectMatch = {
  subjectId: string;
  level: string | null;          // null = teacher is flexible on level
  yearsExperience: number | null;
};

export type MatchCandidate = {
  teacherProfileId: string;
  userId: string;
  fullName: string;
  bio: string | null;
  hourlyRate: number;
  locationType: LocationType;
  city: string | null;
  ratingAvg: number;
  ratingCount: number;
  isVerified: boolean;
  isActive: boolean;
  lastActiveAt: string | null;   // ISO timestamp
  userStatus: UserStatus;
  subjectMatches: SubjectMatch[]; // all teacher_subjects rows for the queried subject
  availabilitySlots: AvailabilitySlot[];
  scheduledLessonsThisWeek: number;
};

// Candidate that passed all hard filters.
// _-prefixed fields are computed by the filter layer and consumed by the scoring layer.
export type FilteredCandidate = MatchCandidate & {
  _bestSubjectMatch: SubjectMatch;
  _availabilityOverlap: AvailabilityOverlap;
};

export type AvailabilityOverlap = {
  totalMinutes: number;
  matchingSlots: { dayOfWeek: number; overlapMinutes: number }[];
  isFullOverlap: boolean;    // totalMinutes >= FULL_OVERLAP_THRESHOLD (60 min)
  isPartialOverlap: boolean; // totalMinutes >= PARTIAL_OVERLAP_THRESHOLD (30 min) but < full
  isValid: boolean;          // totalMinutes >= PARTIAL_OVERLAP_THRESHOLD — minimum usable
};

export type ScoreBreakdown = {
  expertise: number;    // 0–1
  availability: number; // 0–1
  price: number;        // 0–1
  reliability: number;  // 0–1
  activity: number;     // 0–1
  total: number;        // weighted sum 0–1
};

export type ScoredMatch = {
  candidate: MatchCandidate;
  subjectMatch: SubjectMatch;          // the level row used for scoring
  score: number;                       // = scoreBreakdown.total
  scoreBreakdown: ScoreBreakdown;
  availabilityOverlap: AvailabilityOverlap;
  reason: string;                      // human-readable explanation
  fallbackPhase: FallbackPhase;
};

export type MatchingResult = {
  intake: IntakeWithContext;
  candidates: ScoredMatch[];           // max 3, ranked
  fallbackPhaseUsed: FallbackPhase;
};

// ── Write Layer Types ─────────────────────────────────────────────────────────

// Data row to insert into match_results.
export type MatchResultRow = {
  intakeId: string;
  teacherId: string;     // teacher_profile_id (FK to teacher_profiles.id)
  rank: number;          // 1–3
  matchScore: number;    // 0–100, stored as numeric(5,2)
  reason: string;
  wasSelected: boolean;  // always false at match time
};

// Single match entry returned in the API response.
export type MatchApiEntry = {
  id: string;            // match_results.id (uuid)
  teacherId: string;
  rank: number;
  matchScore: number;
  reason: string;
  fallbackPhase: FallbackPhase;
  // Teacher profile details — enriched at response time from the in-memory candidate pool
  teacherFullName: string;
  teacherHourlyRate: number;
  teacherBio: string | null;
  teacherRatingAvg: number;
  teacherRatingCount: number;
  teacherIsVerified: boolean;
};

// Full result returned by runMatching.
export type MatchingWriteResult = {
  intakeId: string;
  matches: MatchApiEntry[];
  fallbackPhaseUsed: FallbackPhase;
  matchingVersion: string;
};
