// Shared types for the teacher onboarding module.

export type OnboardingDraftRow = {
  id: string;
  userId: string;
  onboardingStep: number;
  onboardingCompleted: boolean;
  fullName: string | null;
  hourlyRate: number | null;
  professionalStatus: string | null;
  legalTax: boolean;
  legalContractor: boolean;
  legalMinors: boolean;
  legalCommunity: boolean;
  // Raw JSONB blob — shape matches OnboardingDraftRemote on the frontend.
  draftData: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

// Fields accepted by upsertOnboardingDraft.
// Every field is optional — only provided fields are written to the DB.
// draftData uses the 'in' operator trick (see repository) to distinguish
// "send null" from "don't touch".
export type UpsertOnboardingDraftInput = {
  onboardingStep: number;
  onboardingCompleted?: boolean;
  fullName?: string | null;
  hourlyRate?: number | null;
  professionalStatus?: string | null;
  legalTax?: boolean;
  legalContractor?: boolean;
  legalMinors?: boolean;
  legalCommunity?: boolean;
  draftData?: Record<string, unknown> | null;
};
