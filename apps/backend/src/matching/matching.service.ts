// READ-ONLY orchestration only. No DB writes. No inserts. No status updates.

import { AppError } from '../errors/AppError.js';
import { assertStudentAccess } from '../auth/ownership.js';
import { withTransaction } from '../db/transaction.js';
import type { LocalUser } from '../auth/authTypes.js';
import type {
  FallbackPhase,
  MatchApiEntry,
  MatchCandidate,
  MatchingResult,
  MatchingWriteResult,
  MatchResultRow,
  ScoredMatch,
} from './matching.types.js';
import {
  deleteMatchResults,
  findInitialTeacherCandidates,
  getStudentIntakeById,
  insertMatchResults,
  lockIntakeForUpdate,
  updateIntakeStatus,
} from './matching.repository.js';
import { applyHardFilters, type FilterContext } from './matching.filters.js';
import { scoreAndRankCandidates } from './matching.scoring.js';
import type { IntakeWithContext } from './matching.types.js';

const MAX_MATCH_RESULTS = 3;
const MATCHING_VERSION = 'v1';

// ── Fallback Phase Sequence ───────────────────────────────────────────────────

// Ordered from most-strict to most-permissive.
// The service runs all phases in-memory and stops at the first phase that
// produces enough results. No results are written to the DB here — that is
// deferred to the write layer (matching.repository write functions, transaction).
const FALLBACK_PHASES: { phase: FallbackPhase; context: FilterContext }[] = [
  {
    phase: 'strict',
    context: { phase: 'strict' },
  },
  {
    phase: 'budget_expansion',
    context: { phase: 'budget_expansion', relaxBudget: true },
  },
  {
    phase: 'online_fallback',
    context: { phase: 'online_fallback', relaxBudget: true, forceOnline: true },
  },
  {
    phase: 'partial_results',
    context: { phase: 'partial_results', relaxBudget: true, forceOnline: true },
  },
];

// ── Context Builder ───────────────────────────────────────────────────────────

// forceOnline must never be applied when the intake explicitly requests frontal lessons.
// Doing so would override the user's preference and potentially return teachers
// the student cannot meet in person. The schema has no "frontal_only_strict" flag,
// so we treat any intake with location_preference = 'frontal' as a strict frontal
// request and suppress the online fallback unconditionally.
function makeEffectiveContext(
  context: FilterContext,
  intake: { locationPreference: string },
): FilterContext {
  if (context.forceOnline && intake.locationPreference === 'frontal') {
    return { ...context, forceOnline: false };
  }
  return context;
}

// ── In-Memory Match Computation ───────────────────────────────────────────────

// Pure in-memory fallback loop. No DB access. Same logic used by both the
// read-only path (runMatchingRead) and the write path (runMatching).
function computeMatches(
  candidates: MatchCandidate[],
  intake: IntakeWithContext,
): { candidates: ScoredMatch[]; fallbackPhaseUsed: FallbackPhase } {
  let usedPhase: FallbackPhase = 'partial_results';
  let finalCandidates: ScoredMatch[] = [];

  for (const { phase, context } of FALLBACK_PHASES) {
    const effectiveContext = makeEffectiveContext(context, intake);
    const filtered = applyHardFilters(candidates, intake, effectiveContext);
    const scored = scoreAndRankCandidates(filtered, intake, phase);
    const top = scored.slice(0, MAX_MATCH_RESULTS);

    if (top.length >= MAX_MATCH_RESULTS) {
      usedPhase = phase;
      finalCandidates = top;
      break;
    }

    if (phase === 'partial_results') {
      usedPhase = phase;
      finalCandidates = top;
    }
  }

  return { candidates: finalCandidates, fallbackPhaseUsed: usedPhase };
}

// ── Read Service ──────────────────────────────────────────────────────────────

export async function runMatchingRead(
  intakeId: string,
  currentUser: LocalUser,
): Promise<MatchingResult> {
  // ── Load intake ───────────────────────────────────────────────────────────
  const intake = await getStudentIntakeById(intakeId);

  if (!intake) {
    throw new AppError('Student intake not found', 404);
  }

  // ── Ownership check ───────────────────────────────────────────────────────
  await assertStudentAccess(currentUser.id, currentUser.role, intake.studentId);

  // ── Status guard ──────────────────────────────────────────────────────────
  if (intake.status !== 'open') {
    throw new AppError(
      `Matching requires an open intake; current status is '${intake.status}'`,
      422,
    );
  }

  // ── Load raw candidates ───────────────────────────────────────────────────
  const candidates = await findInitialTeacherCandidates(intake.subjectId);

  // ── Run in-memory fallback loop ───────────────────────────────────────────
  const { candidates: finalCandidates, fallbackPhaseUsed } = computeMatches(candidates, intake);

  return {
    intake,
    candidates: finalCandidates,
    fallbackPhaseUsed,
  };
}

// ── Write Service ─────────────────────────────────────────────────────────────

export async function runMatching(
  intakeId: string,
  currentUser: LocalUser,
): Promise<MatchingWriteResult> {
  const startTime = Date.now();

  // ── Pre-transaction: load + authorize + compute ───────────────────────────
  // Expensive reads happen before the transaction to minimize lock hold time.
  // The transaction re-locks the intake row to detect concurrent modifications.

  const intake = await getStudentIntakeById(intakeId);
  if (!intake) {
    throw new AppError('Student intake not found', 404);
  }

  await assertStudentAccess(currentUser.id, currentUser.role, intake.studentId);

  const candidatePool = await findInitialTeacherCandidates(intake.subjectId);
  const { candidates: scored, fallbackPhaseUsed } = computeMatches(candidatePool, intake);

  const matchRows: MatchResultRow[] = scored.map((m, idx) => ({
    intakeId,
    teacherId: m.candidate.teacherProfileId,
    rank: idx + 1,
    matchScore: parseFloat((m.score * 100).toFixed(2)),
    reason: m.reason,
    wasSelected: false,
  }));

  // ── Transaction: lock → delete → insert → update ──────────────────────────
  let insertedRows: Awaited<ReturnType<typeof insertMatchResults>> = [];

  await withTransaction(async (sql) => {
    const lock = await lockIntakeForUpdate(sql, intakeId);
    if (!lock) {
      throw new AppError('Student intake not found', 404);
    }

    // Only 'closed' intakes are permanently ineligible. 'matched' intakes may
    // be re-run to refresh results (idempotent by design: delete then insert).
    if (lock.status === 'closed') {
      throw new AppError("Cannot run matching on a closed intake", 422);
    }

    await deleteMatchResults(sql, intakeId);

    if (matchRows.length > 0) {
      insertedRows = await insertMatchResults(sql, matchRows);
    }

    const nextStatus = matchRows.length > 0 ? 'matched' : 'open';
    await updateIntakeStatus(sql, intakeId, nextStatus);
  });

  const scoredByTeacherId = new Map(scored.map((match) => [match.candidate.teacherProfileId, match]));
  const matches: MatchApiEntry[] = insertedRows.map((row) => {
    const scoredMatch = scoredByTeacherId.get(row.teacherId);
    if (!scoredMatch) {
      throw new AppError('Failed to enrich matching response', 500);
    }

    return {
      ...row,
      fallbackPhase: fallbackPhaseUsed,
      teacherFullName: scoredMatch.candidate.fullName,
      teacherHourlyRate: scoredMatch.candidate.hourlyRate,
      teacherBio: scoredMatch.candidate.bio,
      teacherRatingAvg: scoredMatch.candidate.ratingAvg,
      teacherRatingCount: scoredMatch.candidate.ratingCount,
      teacherIsVerified: scoredMatch.candidate.isVerified,
    };
  });

  console.log(
    JSON.stringify({
      event: 'matching_run_complete',
      intake_id: intakeId,
      fallback_phase_used: fallbackPhaseUsed,
      matches_count: matches.length,
      runtime_ms: Date.now() - startTime,
      matching_version: MATCHING_VERSION,
    }),
  );

  return {
    intakeId,
    matches,
    fallbackPhaseUsed,
    matchingVersion: MATCHING_VERSION,
  };
}
