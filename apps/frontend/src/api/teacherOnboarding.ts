import { apiRequest, type ApiResponse } from './client';
import type { TeacherOnboardingData } from '../pages/TeacherOnboardingPage';

// ── Shape returned by the backend GET/PUT endpoints ────────────────────────────

export type OnboardingDraftRemote = {
  institution: string;
  degree: string;
  academicYear: string;
  excellentCourses: string;
  yearsOfExperience: string;
  expertiseAreas: string;
  teachingLevels: string[];
  selectedSubjects: string[];
  teachingStyles: string[];
  availabilityMode: 'calendar' | 'manual' | null;
  weeklyAvailability: string[];
  weeklyTimeBlocks?: string[];
  weeklyTeachingHours: number | null;
  autoStopMatching: boolean;
  bookingApproval: 'automatic' | 'manual' | null;
  slaHours: number | null;
  slaAutoAction: 'approve' | 'decline' | null;
  commitmentTypes: string[];
  marathonSessionCount: number | null;
  emergencyAvailability: string | null;
  introSessionPricing: string | null;
  maxActiveStudents: number | null;
};

export type OnboardingStateRemote = {
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
  draft: OnboardingDraftRemote | null;
};

export type CompleteOnboardingResult = {
  teacherProfileId: string;
  nextRoute: string;
};

// ── Request body builders ──────────────────────────────────────────────────────

function buildSaveBody(data: TeacherOnboardingData, step: number) {
  return {
    fullName: data.fullName,
    hourlyRate: data.hourlyRate || '0',
    professionalStatus: data.professionalStatus,
    onboardingStep: step,
    legalTax: data.legalTax,
    legalContractor: data.legalContractor,
    legalMinors: data.legalMinors,
    legalCommunity: data.legalCommunity,
    draft: {
      institution: data.institution,
      degree: data.degree,
      academicYear: data.academicYear,
      excellentCourses: data.excellentCourses,
      yearsOfExperience: data.yearsOfExperience,
      expertiseAreas: data.expertiseAreas,
      teachingLevels: data.teachingLevels,
      selectedSubjects: data.selectedSubjects,
      teachingStyles: data.teachingStyles,
      availabilityMode: data.availabilityMode,
      weeklyAvailability: data.weeklyAvailability,
      weeklyTimeBlocks: data.weeklyTimeBlocks,
      weeklyTeachingHours: data.weeklyTeachingHours,
      autoStopMatching: data.autoStopMatching,
      bookingApproval: data.bookingApproval,
      slaHours: data.slaHours,
      slaAutoAction: data.slaAutoAction,
      commitmentTypes: data.commitmentTypes,
      marathonSessionCount: data.marathonSessionCount,
      emergencyAvailability: data.emergencyAvailability,
      introSessionPricing: data.introSessionPricing,
      maxActiveStudents: data.maxActiveStudents,
    },
  };
}

// ── API functions ──────────────────────────────────────────────────────────────

export async function fetchOnboardingDraft(
  accessToken: string,
): Promise<ApiResponse<{ onboarding: OnboardingStateRemote | null }>> {
  return apiRequest('/api/teachers/me/onboarding', { method: 'GET' }, accessToken);
}

export async function saveOnboardingDraft(
  data: TeacherOnboardingData,
  step: number,
  accessToken: string,
): Promise<ApiResponse<{ onboarding: OnboardingStateRemote }>> {
  return apiRequest(
    '/api/teachers/me/onboarding',
    { method: 'PUT', body: JSON.stringify(buildSaveBody(data, step)) },
    accessToken,
  );
}

export async function completeOnboarding(
  data: TeacherOnboardingData,
  accessToken: string,
): Promise<ApiResponse<CompleteOnboardingResult>> {
  return apiRequest(
    '/api/teachers/me/onboarding/complete',
    {
      method: 'POST',
      body: JSON.stringify({
        fullName: data.fullName,
        hourlyRate: data.hourlyRate || '0',
        professionalStatus: data.professionalStatus,
        legalTax: data.legalTax,
        legalContractor: data.legalContractor,
        legalMinors: data.legalMinors,
        legalCommunity: data.legalCommunity,
        draft: {
          institution: data.institution,
          degree: data.degree,
          academicYear: data.academicYear,
          excellentCourses: data.excellentCourses,
          yearsOfExperience: data.yearsOfExperience,
          expertiseAreas: data.expertiseAreas,
          teachingLevels: data.teachingLevels,
          selectedSubjects: data.selectedSubjects,
          teachingStyles: data.teachingStyles,
          availabilityMode: data.availabilityMode,
          weeklyAvailability: data.weeklyAvailability,
          weeklyTimeBlocks: data.weeklyTimeBlocks,
          weeklyTeachingHours: data.weeklyTeachingHours,
          autoStopMatching: data.autoStopMatching,
          bookingApproval: data.bookingApproval,
          slaHours: data.slaHours,
          slaAutoAction: data.slaAutoAction,
          commitmentTypes: data.commitmentTypes,
          marathonSessionCount: data.marathonSessionCount,
          emergencyAvailability: data.emergencyAvailability,
          introSessionPricing: data.introSessionPricing,
          maxActiveStudents: data.maxActiveStudents,
        },
      }),
    },
    accessToken,
  );
}

// ── Draft → local state hydration ─────────────────────────────────────────────

export function hydrateFromRemote(
  remote: OnboardingStateRemote,
  currentData: TeacherOnboardingData,
): Partial<TeacherOnboardingData> {
  const draft = remote.draft;
  return {
    fullName: remote.fullName || currentData.fullName,
    hourlyRate: remote.hourlyRate > 0 ? String(remote.hourlyRate) : currentData.hourlyRate,
    professionalStatus: (remote.professionalStatus as TeacherOnboardingData['professionalStatus']) ?? currentData.professionalStatus,
    legalTax: remote.legalTax,
    legalContractor: remote.legalContractor,
    legalMinors: remote.legalMinors,
    legalCommunity: remote.legalCommunity,
    ...(draft
      ? {
          institution: draft.institution || currentData.institution,
          degree: draft.degree || currentData.degree,
          academicYear: draft.academicYear || currentData.academicYear,
          excellentCourses: draft.excellentCourses || currentData.excellentCourses,
          yearsOfExperience: draft.yearsOfExperience || currentData.yearsOfExperience,
          expertiseAreas: draft.expertiseAreas || currentData.expertiseAreas,
          teachingLevels: (draft.teachingLevels as TeacherOnboardingData['teachingLevels'] | undefined)?.length
            ? (draft.teachingLevels as TeacherOnboardingData['teachingLevels'])
            : currentData.teachingLevels,
          selectedSubjects: draft.selectedSubjects?.length > 0 ? draft.selectedSubjects : currentData.selectedSubjects,
          teachingStyles: draft.teachingStyles?.length > 0 ? draft.teachingStyles : currentData.teachingStyles,
          availabilityMode: draft.availabilityMode ?? currentData.availabilityMode,
          weeklyAvailability: draft.weeklyAvailability?.length > 0 ? draft.weeklyAvailability : currentData.weeklyAvailability,
          weeklyTimeBlocks: draft.weeklyTimeBlocks ?? currentData.weeklyTimeBlocks,
          weeklyTeachingHours: draft.weeklyTeachingHours ?? currentData.weeklyTeachingHours,
          autoStopMatching: draft.autoStopMatching,
          bookingApproval: draft.bookingApproval ?? currentData.bookingApproval,
          slaHours: draft.slaHours ?? currentData.slaHours,
          slaAutoAction: draft.slaAutoAction ?? currentData.slaAutoAction,
          commitmentTypes: draft.commitmentTypes?.length > 0 ? draft.commitmentTypes : currentData.commitmentTypes,
          marathonSessionCount: draft.marathonSessionCount ?? currentData.marathonSessionCount,
          emergencyAvailability: draft.emergencyAvailability ?? currentData.emergencyAvailability,
          introSessionPricing: draft.introSessionPricing ?? currentData.introSessionPricing,
          maxActiveStudents: draft.maxActiveStudents ?? currentData.maxActiveStudents,
        }
      : {}),
  };
}
