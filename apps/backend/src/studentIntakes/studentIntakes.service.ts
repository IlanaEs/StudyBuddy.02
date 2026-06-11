// Business logic only. No DB access. No HTTP concerns.

import { assertStudentAccess } from '../auth/ownership.js';
import type { LocalUser } from '../auth/authTypes.js';
import { AppError } from '../errors/AppError.js';
import { normalizeLevelToBand } from './levelBand.js';
import {
  createStudentIntake as repoCreate,
  findSubjectIdByName,
  getLatestStudentIntakeByStudentId,
  getStudentIdByUserId,
} from './studentIntakes.repository.js';
import type { CreateIntakeBody } from './studentIntakes.validation.js';
import type { LatestIntakeResult, StudentIntakeSummary } from './studentIntakes.types.js';

export async function createIntake(
  body: CreateIntakeBody,
  currentUser: LocalUser,
): Promise<StudentIntakeSummary> {
  // ── Ownership guard ───────────────────────────────────────────────────────
  // Delegates to the shared helper: student → own profile, parent → linked child,
  // admin → any, teacher → never.
  await assertStudentAccess(currentUser.id, currentUser.role, body.student_id);

  // ── Normalization ─────────────────────────────────────────────────────────
  // Remove duplicate days and sort so DB storage is deterministic.
  const preferredDays =
    body.preferred_days != null
      ? [...new Set(body.preferred_days)].sort((a, b) => a - b)
      : null;
  // Manual-match lead (off-taxonomy course): store the free-text on the intake,
  // flagged for manual matching — no resolved subject, no automatic matching.
  const isManualMatch = body.needs_manual_match === true && !!body.custom_subject_text?.trim();

  const subjectId = isManualMatch
    ? null
    : (body.subject_id ?? (body.subject_name ? await findSubjectIdByName(body.subject_name) : null));

  if (!isManualMatch && !subjectId) {
    throw new AppError('לא נמצא מקצוע מתאים במערכת. בחרו מקצוע מהרשימה ונסו שוב.', 422);
  }

  return repoCreate({
    studentId: body.student_id,
    subjectId,
    customSubjectText: isManualMatch ? body.custom_subject_text!.trim() : null,
    needsManualMatch: isManualMatch,
    // Normalize the raw grade/level (e.g. "ג׳", "כיתה ח׳") into a matching band
    // (elementary|middle|high|academic) so it lines up with teacher_subjects.level.
    // Both wizards POST here, so both store band levels consistently. Unrecognized
    // values become null (= no level preference), never a wrong band.
    level: normalizeLevelToBand(body.level),
    goal: body.goal ?? null,
    locationPreference: body.location_preference,
    city: body.city ?? null,
    budgetMin: body.budget_min ?? null,
    budgetMax: body.budget_max ?? null,
    preferredDays,
    preferredTimeRanges: body.preferred_time_ranges ?? null,
    learningStyle: body.learning_style ?? null,
    urgency: body.urgency ?? null,
    softCriteria: body.soft_criteria ?? null,
    createdByUserId: currentUser.id,
  });
}

// Latest intake for the authenticated student — pre-fills the quick wizard.
// Three distinct outcomes, none of which is a 500:
//   • no students row (registration genuinely incomplete) → AppError 404
//   • profile exists, no prior intake                     → { student_id, intake: null }
//   • profile + prior intake                              → { student_id, intake }
// The 404 vs intake:null split lets the client avoid falsely telling a profiled
// student to "complete registration" when they simply have no previous search.
export async function getMyLatestIntake(currentUser: LocalUser): Promise<LatestIntakeResult> {
  const studentId = await getStudentIdByUserId(currentUser.id);
  if (!studentId) {
    throw new AppError('No student profile found', 404);
  }
  const intake = await getLatestStudentIntakeByStudentId(studentId);
  return { student_id: studentId, intake };
}
