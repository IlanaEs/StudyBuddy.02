import { z } from 'zod';

const onboardingDraftSchema = z
  .object({
    institution: z.string().max(200),
    degree: z.string().max(200),
    academicYear: z.string().max(50),
    excellentCourses: z.string().max(1000),
    yearsOfExperience: z.string().max(50),
    expertiseAreas: z.string().max(500),
    teachingLevels: z.array(z.string().max(50)),
    selectedSubjects: z.array(z.string().max(100)),
    teachingStyles: z.array(z.string().max(100)),
    availabilityMode: z.enum(['calendar', 'manual']).nullable(),
    weeklyAvailability: z.array(z.string().max(20)),
    weeklyTimeBlocks: z.array(z.string().max(30)).optional(),
    weeklyTeachingHours: z.number().int().min(0).max(168).nullable(),
    autoStopMatching: z.boolean(),
    bookingApproval: z.enum(['automatic', 'manual']).nullable(),
    slaHours: z.number().int().min(0).max(720).nullable(),
    slaAutoAction: z.enum(['approve', 'decline']).nullable(),
    commitmentTypes: z.array(z.string().max(100)),
    marathonSessionCount: z.number().int().min(0).max(100).nullable(),
    emergencyAvailability: z.string().max(100).nullable(),
    introSessionPricing: z.string().max(100).nullable(),
    maxActiveStudents: z.number().int().min(0).max(500).nullable(),
  })
  .partial();

export const saveOnboardingSchema = z.object({
  body: z
    .object({
      fullName: z.string().min(1).max(150),
      hourlyRate: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a numeric rate'),
      professionalStatus: z.string().max(50).nullable(),
      onboardingStep: z.number().int().min(1).max(8),
      legalTax: z.boolean(),
      legalContractor: z.boolean(),
      legalMinors: z.boolean(),
      legalCommunity: z.boolean(),
      draft: onboardingDraftSchema,
    })
    .partial(),
});

export const completeOnboardingSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(150),
    hourlyRate: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a numeric rate'),
    professionalStatus: z.string().max(50).nullable(),
    legalTax: z.literal(true, { errorMap: () => ({ message: 'Tax declaration is required' }) }),
    legalContractor: z.literal(true, { errorMap: () => ({ message: 'Contractor declaration is required' }) }),
    legalMinors: z.literal(true, { errorMap: () => ({ message: 'Minor safety declaration is required' }) }),
    legalCommunity: z.literal(true, { errorMap: () => ({ message: 'Community declaration is required' }) }),
    draft: onboardingDraftSchema,
  }),
});

export type SaveOnboardingBody = z.infer<typeof saveOnboardingSchema>['body'];
export type CompleteOnboardingBody = z.infer<typeof completeOnboardingSchema>['body'];
