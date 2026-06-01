import { z } from 'zod';

// ── PUT /api/teachers/me/onboarding ──────────────────────────────────────────
// Accepts a partial snapshot of the onboarding form. All top-level fields are
// optional except onboardingStep. The draft blob is accepted as-is (JSONB).

const saveOnboardingBodySchema = z.object({
  fullName: z.string().min(1).max(150).optional(),
  // Frontend sends hourlyRate as a numeric string; coerce to number.
  hourlyRate: z.coerce.number().min(0).optional(),
  professionalStatus: z.string().max(100).nullable().optional(),
  onboardingStep: z.number().int().min(1).max(10),
  legalTax: z.boolean().optional(),
  legalContractor: z.boolean().optional(),
  legalMinors: z.boolean().optional(),
  legalCommunity: z.boolean().optional(),
  draft: z.record(z.unknown()).nullable().optional(),
});

export const saveOnboardingSchema = z.object({ body: saveOnboardingBodySchema });

export type SaveOnboardingBody = z.infer<typeof saveOnboardingBodySchema>;

// ── POST /api/teachers/me/onboarding/complete ─────────────────────────────────
// Final submission — fullName and hourlyRate are required to create the profile.

const completeOnboardingBodySchema = z.object({
  fullName: z.string().min(1).max(150),
  hourlyRate: z.coerce.number().min(0),
  professionalStatus: z.string().max(100).nullable().optional(),
  legalTax: z.boolean().optional(),
  legalContractor: z.boolean().optional(),
  legalMinors: z.boolean().optional(),
  legalCommunity: z.boolean().optional(),
  draft: z.record(z.unknown()).nullable().optional(),
});

export const completeOnboardingSchema = z.object({ body: completeOnboardingBodySchema });

export type CompleteOnboardingBody = z.infer<typeof completeOnboardingBodySchema>;
