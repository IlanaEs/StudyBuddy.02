export type UserContext = 'student' | 'parent';
export type LearningGoal = 'single_session' | 'ongoing' | 'exam_prep';
export type EducationLevel = 'elementary' | 'middle' | 'high' | 'academic';
export type LocationPreference = 'online' | 'frontal' | 'both';
export type Urgency = 'urgent' | 'this_week' | 'flexible';
export type TimeSlot = 'morning' | 'afternoon' | 'evening';

export interface StudentIntakeState {
  userContext: UserContext | null;
  fullName: string;
  learningGoal: LearningGoal | null;
  gradeLevel: EducationLevel | null;
  subLevel: string;   // e.g. "י׳", "שנה ב׳", etc.
  subjectId: string;
  subjectName: string;
  level: string;
  goal: string;
  budgetMin: number | null;
  budgetMax: number | null;
  preferredDays: string[];
  preferredTimeRanges: TimeSlot[];
  urgency: Urgency | null;
  locationPreference: LocationPreference | null;
  city: string;
  learningStyle: string[];
  softPreferences: string[];
}

export interface MatchResult {
  id: string;
  rank: number;
  matchScore: number;
  reason?: string;
  teacher: {
    id: string;
    fullName: string;
    bio?: string;
    hourlyRate: number;
    ratingAvg: number;
    ratingCount: number;
    isVerified: boolean;
    subjects?: string[];
    availabilityPreview?: string;
  };
  matchBadges?: MatchBadge[];
}

export interface MatchBadge {
  icon: string;
  label: string;
  detail: string;
}

export interface BookingRequest {
  teacherId: string;
  matchResultId: string;
  requestedStartAt: string;
  requestedEndAt: string;
  studentMessage: string;
  status: 'pending';
}
