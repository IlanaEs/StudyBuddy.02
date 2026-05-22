// Fields stored in onboarding_draft jsonb.
// Each field is documented with its intended permanent home.
export type OnboardingDraft = {
  // Academic background — no dedicated DB columns yet
  institution: string;
  degree: string;
  academicYear: string;
  excellentCourses: string;
  yearsOfExperience: string;
  expertiseAreas: string;
  // Teaching preferences — no dedicated DB columns yet
  teachingLevels: string[];
  // TODO: resolve subject names to teacher_subjects.subject_id once subjects table is seeded
  selectedSubjects: string[];
  teachingStyles: string[];
  // Availability — weeklyAvailability maps to availability_slots rows on completion
  availabilityMode: 'calendar' | 'manual' | null;
  weeklyAvailability: string[];
  weeklyTimeBlocks?: string[];
  weeklyTeachingHours: number | null;
  // Operational settings — no dedicated DB columns yet
  autoStopMatching: boolean;
  bookingApproval: 'automatic' | 'manual' | null;
  slaHours: number | null;
  slaAutoAction: 'approve' | 'decline' | null;
  commitmentTypes: string[];
  marathonSessionCount: number | null;
  emergencyAvailability: string | null;
  introSessionPricing: string | null;
  // Capacity — maps to teacher_subscriptions.student_limit on completion
  maxActiveStudents: number | null;
  // Google Calendar integration — safe metadata only, no raw tokens
  googleCalendarConnected?: boolean;
  googleCalendarLastSyncedAt?: string | null;
  busySlots?: Array<{ startAt: string; endAt: string; source: 'google_calendar' }>;
};

export type TeacherOnboardingState = {
  teacherProfileId: string;
  fullName: string;
  hourlyRate: number;
  professionalStatus: string | null;
  onboardingStep: number;
  onboardingCompleted: boolean;
  legalTax: boolean;
  legalContractor: boolean;
  legalMinors: boolean;
  legalCommunity: boolean;
  draft: OnboardingDraft | null;
};

export type CompleteOnboardingResult = {
  teacherProfileId: string;
  nextRoute: string;
};
