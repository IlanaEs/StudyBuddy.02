// Business logic only. No DB access. No HTTP concerns.

import { AppError } from '../errors/AppError.js';
import type { LocalUser } from '../auth/authTypes.js';
import {
  academicFieldExists,
  academicInstitutionExists,
  pendingRepositoryRequestExists,
} from '../academicRepositories/academicRepositories.repository.js';
import type { SaveOnboardingBody, CompleteOnboardingBody } from './teacherOnboarding.validation.js';
import type { OnboardingDraftRow } from './teacherOnboarding.types.js';
import {
  getOnboardingDraftByUserId,
  upsertOnboardingDraft,
  upsertTeacherProfile,
  updateUserFullName,
  activateTeacherProfile,
  replaceTeacherSubjects,
  replaceTeacherAvailability,
} from './teacherOnboarding.repository.js';

const ACADEMIC_PATH_STATUSES = new Set([
  'student_instructor',
  'certified_teacher',
  'academic_assistant',
  'excellent_courses',
]);

function readString(draft: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = draft?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

async function validateAcademicRepositoryRefs(
  draft: Record<string, unknown> | null | undefined,
  currentUser: LocalUser,
  professionalStatus?: string | null,
) {
  const institutionId = readString(draft, 'academicInstitutionId');
  const institutionRequestId = readString(draft, 'academicInstitutionRequestId');
  const fieldId = readString(draft, 'academicFieldId');
  const fieldRequestId = readString(draft, 'academicFieldRequestId');
  const legacyInstitution = readString(draft, 'institution');
  const legacyDegree = readString(draft, 'degree');
  const requiresAcademicRefs = professionalStatus ? ACADEMIC_PATH_STATUSES.has(professionalStatus) : false;

  if (requiresAcademicRefs && !institutionId && !institutionRequestId) {
    throw new AppError('יש לבחור מוסד לימודים מתוך הרשימה או לשלוח בקשת הוספה.', 400);
  }

  if (requiresAcademicRefs && !fieldId && !fieldRequestId) {
    throw new AppError('יש לבחור תחום לימוד מתוך הרשימה או לשלוח בקשת הוספה.', 400);
  }

  if (legacyInstitution && !institutionId && !institutionRequestId) {
    throw new AppError('יש לבחור מוסד לימודים מתוך הרשימה או בקשת הוספה מאושרת לשמירה.', 400);
  }

  if (legacyDegree && !fieldId && !fieldRequestId) {
    throw new AppError('יש לבחור תחום לימוד מתוך הרשימה או בקשת הוספה מאושרת לשמירה.', 400);
  }

  if (institutionId && !(await academicInstitutionExists(institutionId))) {
    throw new AppError('מוסד הלימודים שנבחר אינו קיים במאגר.', 400);
  }

  if (institutionRequestId && !(await pendingRepositoryRequestExists({
    id: institutionRequestId,
    repositoryType: 'institution',
    userId: currentUser.id,
  }))) {
    throw new AppError('בקשת מוסד הלימודים אינה תקפה או אינה ממתינה לאישור.', 400);
  }

  if (fieldId && !(await academicFieldExists(fieldId))) {
    throw new AppError('תחום הלימוד שנבחר אינו קיים במאגר.', 400);
  }

  if (fieldRequestId && !(await pendingRepositoryRequestExists({
    id: fieldRequestId,
    repositoryType: 'field',
    userId: currentUser.id,
  }))) {
    throw new AppError('בקשת תחום הלימוד אינה תקפה או אינה ממתינה לאישור.', 400);
  }
}

// ── Response shape — matches OnboardingStateRemote on the frontend ─────────────

function toRemote(row: OnboardingDraftRow, teacherProfileId: string) {
  return {
    teacherProfileId,
    fullName: row.fullName ?? '',
    hourlyRate: row.hourlyRate ?? 0,
    professionalStatus: row.professionalStatus,
    onboardingStep: row.onboardingStep,
    onboardingCompleted: row.onboardingCompleted,
    legalTax: row.legalTax,
    legalContractor: row.legalContractor,
    legalMinors: row.legalMinors,
    legalCommunity: row.legalCommunity,
    // The JSONB blob is returned as-is; it hydrates directly into
    // OnboardingDraftRemote on the frontend via hydrateFromRemote().
    draft: row.draftData,
  };
}

// ── GET /api/teachers/me/onboarding ──────────────────────────────────────────

export async function getMyOnboarding(currentUser: LocalUser) {
  if (currentUser.role !== 'teacher') {
    throw new AppError('Forbidden', 403);
  }

  const row = await getOnboardingDraftByUserId(currentUser.id);
  if (!row) return null;

  return toRemote(row, '');
}

// ── PUT /api/teachers/me/onboarding ──────────────────────────────────────────

export async function saveMyOnboarding(
  body: SaveOnboardingBody,
  currentUser: LocalUser,
) {
  if (currentUser.role !== 'teacher') {
    throw new AppError('Forbidden', 403);
  }

  await validateAcademicRepositoryRefs(body.draft, currentUser, body.professionalStatus);

  const row = await upsertOnboardingDraft(currentUser.id, {
    onboardingStep: body.onboardingStep,
    fullName: body.fullName,
    hourlyRate: body.hourlyRate,
    professionalStatus: body.professionalStatus,
    legalTax: body.legalTax,
    legalContractor: body.legalContractor,
    legalMinors: body.legalMinors,
    legalCommunity: body.legalCommunity,
    draftData: body.draft ?? null,
  });

  return toRemote(row, '');
}

// ── POST /api/teachers/me/onboarding/complete ─────────────────────────────────

export async function completeMyOnboarding(
  body: CompleteOnboardingBody,
  currentUser: LocalUser,
) {
  if (currentUser.role !== 'teacher') {
    throw new AppError('Forbidden', 403);
  }

  await validateAcademicRepositoryRefs(body.draft, currentUser, body.professionalStatus);

  // Persist final form state and mark complete
  await upsertOnboardingDraft(currentUser.id, {
    onboardingStep: 6,
    onboardingCompleted: true,
    fullName: body.fullName,
    hourlyRate: body.hourlyRate,
    professionalStatus: body.professionalStatus,
    legalTax: body.legalTax,
    legalContractor: body.legalContractor,
    legalMinors: body.legalMinors,
    legalCommunity: body.legalCommunity,
    draftData: body.draft ?? null,
  });

  // Keep the users.full_name in sync with what the teacher entered
  await updateUserFullName(currentUser.id, body.fullName);

  // Create profile row if it doesn't exist yet (sets hourly_rate, location_type)
  const teacherProfileId = await upsertTeacherProfile(currentUser.id, body.hourlyRate);

  // Extract draft arrays — draft blob is Record<string, unknown>
  const draft = body.draft ?? {};
  const selectedSubjects = Array.isArray(draft['selectedSubjects']) ? (draft['selectedSubjects'] as string[]) : [];
  const teachingLevels = Array.isArray(draft['teachingLevels']) ? (draft['teachingLevels'] as string[]) : [];
  const weeklyTimeBlocks = Array.isArray(draft['weeklyTimeBlocks']) ? (draft['weeklyTimeBlocks'] as string[]) : [];
  const weeklyAvailability = Array.isArray(draft['weeklyAvailability']) ? (draft['weeklyAvailability'] as string[]) : [];

  // Write availability_slots (replace strategy; errors are fatal so the profile is not activated on partial write)
  await replaceTeacherAvailability(teacherProfileId, weeklyTimeBlocks, weeklyAvailability);

  // Write teacher_subjects — best-effort: requires subjects table to be seeded
  await replaceTeacherSubjects(teacherProfileId, selectedSubjects, teachingLevels[0] ?? null);

  // Activate last — only after all relations are written
  await activateTeacherProfile(teacherProfileId, {
    hourlyRate: body.hourlyRate,
    professionalStatus: body.professionalStatus,
  });

  return {
    teacherProfileId,
    nextRoute: '/teacher/dashboard',
  };
}
