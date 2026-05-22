// Business logic only. No DB access. No HTTP concerns.

import { assertStudentAccess } from '../auth/ownership.js';
import type { LocalUser } from '../auth/authTypes.js';
import { createStudentIntake as repoCreate } from './studentIntakes.repository.js';
import type { CreateIntakeBody } from './studentIntakes.validation.js';
import type { StudentIntakeSummary } from './studentIntakes.types.js';

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

  return repoCreate({
    studentId: body.student_id,
    subjectId: body.subject_id,
    level: body.level ?? null,
    goal: body.goal ?? null,
    locationPreference: body.location_preference,
    city: body.city ?? null,
    budgetMin: body.budget_min ?? null,
    budgetMax: body.budget_max ?? null,
    preferredDays,
    preferredTimeRanges: body.preferred_time_ranges ?? null,
    learningStyle: body.learning_style ?? null,
    urgency: body.urgency ?? null,
    createdByUserId: currentUser.id,
  });
}
