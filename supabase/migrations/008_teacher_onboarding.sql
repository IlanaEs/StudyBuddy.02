-- StudyBuddy.02 DB Schema
-- 008_teacher_onboarding.sql
-- Adds onboarding state tracking to teacher_profiles.
--
-- Design decisions:
--   - professional_status is a proper column (important profile metadata)
--   - legal_* are proper columns (compliance-critical, auditable)
--   - All other onboarding answers that lack a clean DB home are stored in
--     onboarding_draft (jsonb) and documented below
--   - teacher_profiles.is_active remains false during onboarding;
--     completeOnboarding sets it to true
--
-- onboarding_draft jsonb keys (documented TODOs):
--   institution, degree, academicYear, excellentCourses
--     → Academic background; no dedicated table yet
--   yearsOfExperience, expertiseAreas
--     → Experience fields; no dedicated table yet
--   teachingLevels (string[])
--     → Teaching level tags; no dedicated table yet
--   selectedSubjects (string[])
--     → TODO: resolve to teacher_subjects.subject_id once subjects table is seeded
--   teachingStyles (string[])
--     → Style tags; no dedicated table yet
--   availabilityMode ('calendar'|'manual')
--     → Stored in draft; weeklyAvailability maps to availability_slots on completion
--   weeklyAvailability (string[])
--     → Maps to availability_slots (day_of_week) on completion
--   weeklyTeachingHours, autoStopMatching
--     → Operational settings; no dedicated column yet
--   bookingApproval, slaHours, slaAutoAction
--     → Booking/SLA config; no dedicated table yet
--   commitmentTypes, marathonSessionCount, emergencyAvailability
--     → Commitment config; no dedicated table yet
--   introSessionPricing
--     → Pricing config; no dedicated column yet
--   maxActiveStudents
--     → Maps to teacher_subscriptions.student_limit on completion (when subscription plan is set)

alter table public.teacher_profiles
  add column if not exists professional_status varchar(50),
  add column if not exists onboarding_step smallint not null default 1,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_draft jsonb,
  add column if not exists legal_tax boolean not null default false,
  add column if not exists legal_contractor boolean not null default false,
  add column if not exists legal_minors boolean not null default false,
  add column if not exists legal_community boolean not null default false,
  add column if not exists legal_confirmed_at timestamptz;

comment on column public.teacher_profiles.professional_status is 'Teacher self-reported professional status (e.g. certified_teacher, academic, industry_expert).';
comment on column public.teacher_profiles.onboarding_step is 'Last step reached in the onboarding wizard (1–8). Used for resume support.';
comment on column public.teacher_profiles.onboarding_completed is 'True when the teacher has completed all onboarding steps and the profile is active.';
comment on column public.teacher_profiles.onboarding_draft is 'Partial onboarding answers that do not yet have a dedicated DB column. See migration comments for field inventory.';
comment on column public.teacher_profiles.legal_tax is 'Teacher confirmed tax responsibility declaration.';
comment on column public.teacher_profiles.legal_contractor is 'Teacher confirmed independent contractor (not employee) declaration.';
comment on column public.teacher_profiles.legal_minors is 'Teacher confirmed minor safety declaration.';
comment on column public.teacher_profiles.legal_community is 'Teacher confirmed community standards declaration.';
comment on column public.teacher_profiles.legal_confirmed_at is 'Timestamp when all four legal confirmations were accepted (audit trail).';
