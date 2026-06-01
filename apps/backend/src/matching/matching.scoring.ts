// Pure scoring functions only. No DB access. No side effects.

import type {
  AvailabilityOverlap,
  FallbackPhase,
  FilteredCandidate,
  IntakeWithContext,
  ScoreBreakdown,
  ScoredMatch,
  SubjectMatch,
} from './matching.types.js';

// ── Scoring Weights ───────────────────────────────────────────────────────────

const WEIGHTS = {
  reliability:  0.30, // weighted rating dampened by review volume
  expertise:    0.25, // years of experience in the matched subject
  availability: 0.25, // quality of schedule overlap with student
  price:        0.10, // value relative to student's budget
  activity:     0.10, // how recently the teacher was last active
} as const;

// Compile-time check: weights must sum to 1.0 (tolerance for floating-point arithmetic).
const _WEIGHT_SUM = (Object.values(WEIGHTS) as number[]).reduce((a, b) => a + b, 0);
if (Math.abs(_WEIGHT_SUM - 1.0) > 0.001) {
  throw new Error(`Matching scoring weights must sum to 1.0, got ${_WEIGHT_SUM}`);
}

// ── Scoring Constants ─────────────────────────────────────────────────────────

const MAX_EXPERIENCE_YEARS = 10;  // cap: 10+ years → full expertise score
const CONFIDENCE_DENOMINATOR = 10; // reviews needed for full rating confidence
const ACTIVITY_DECAY_DAYS = 30;    // days until activity score decays to 0
const UNKNOWN_EXPERIENCE_DEFAULT = 0.3; // conservative score when years_experience is null

// ── Individual Scorers ────────────────────────────────────────────────────────

function scoreExpertise(subjectMatch: SubjectMatch): number {
  if (subjectMatch.yearsExperience === null) return UNKNOWN_EXPERIENCE_DEFAULT;
  return Math.min(subjectMatch.yearsExperience / MAX_EXPERIENCE_YEARS, 1.0);
}

function scoreAvailability(overlap: AvailabilityOverlap): number {
  if (overlap.isFullOverlap) return 1.0;
  if (overlap.isPartialOverlap) return 0.5;
  // Reached only in partial_results phase where overlap.isValid may be false.
  return overlap.totalMinutes > 0 ? 0.2 : 0.0;
}

function scorePrice(
  hourlyRate: number,
  budgetMin: number | null,
  budgetMax: number | null,
): number {
  // No budget preference → neutral score.
  if (budgetMin === null && budgetMax === null) return 0.5;

  if (budgetMin !== null && budgetMax !== null) {
    const range = budgetMax - budgetMin;
    // Zero range → single target price; exact match is best.
    if (range === 0) return hourlyRate === budgetMin ? 1.0 : 0.5;
    // Lower rate within range = better value for student.
    return Math.max(0, 1.0 - (hourlyRate - budgetMin) / range);
  }

  if (budgetMax !== null) {
    // Only ceiling: reward rates well below the max.
    return budgetMax > 0 ? Math.max(0, (budgetMax - hourlyRate) / budgetMax) : 0.5;
  }

  // Only floor: rate is guaranteed >= min (filter enforces this).
  // Reward rates close to the floor as best value.
  return budgetMin! > 0 ? Math.max(0, budgetMin! / hourlyRate) : 0.5;
}

function scoreReliability(ratingAvg: number, ratingCount: number): number {
  // Dampen rating_avg by confidence based on review volume.
  //   confidence_factor = MIN(rating_count / CONFIDENCE_DENOMINATOR, 1)
  //   weighted_rating   = rating_avg * confidence_factor
  const confidenceFactor = Math.min(ratingCount / CONFIDENCE_DENOMINATOR, 1.0);
  const weightedRating = ratingAvg * confidenceFactor;
  return weightedRating / 5.0; // rating_avg is 0–5; normalize to 0–1
}

function scoreActivity(lastActiveAt: string | null): number {
  if (!lastActiveAt) return 0.1; // no recorded activity → penalize conservatively
  const daysSince =
    (Date.now() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, 1.0 - daysSince / ACTIVITY_DECAY_DAYS);
}

// ── Reason Builder ────────────────────────────────────────────────────────────

function buildReason(
  subjectMatch: SubjectMatch,
  overlap: AvailabilityOverlap,
  ratingAvg: number,
  ratingCount: number,
): string {
  const parts: string[] = [];

  if (subjectMatch.yearsExperience !== null) {
    parts.push(`${subjectMatch.yearsExperience} years experience`);
  }

  if (overlap.isFullOverlap) {
    parts.push('full availability match');
  } else if (overlap.isPartialOverlap) {
    parts.push('partial availability match');
  } else if (overlap.totalMinutes > 0) {
    parts.push(`${overlap.totalMinutes} min overlap`);
  }

  if (ratingCount >= 3) {
    parts.push(`rated ${ratingAvg.toFixed(1)} (${ratingCount} reviews)`);
  } else if (ratingCount > 0) {
    parts.push(`rated ${ratingAvg.toFixed(1)} (few reviews)`);
  } else {
    parts.push('no reviews yet');
  }

  return parts.join(', ');
}

// ── Deterministic Comparator ──────────────────────────────────────────────────

// Order: match_score DESC, availability_overlap DESC, rating_avg DESC,
//        last_active_at DESC, teacherProfileId ASC (stable UUID tiebreaker).
//
// The UUID tiebreaker guarantees that identical candidates always sort the same way
// regardless of JS runtime, array order, or insertion timing.
function compareScoredMatches(a: ScoredMatch, b: ScoredMatch): number {
  if (b.score !== a.score) return b.score - a.score;

  const overlapDiff =
    b.availabilityOverlap.totalMinutes - a.availabilityOverlap.totalMinutes;
  if (overlapDiff !== 0) return overlapDiff;

  if (b.candidate.ratingAvg !== a.candidate.ratingAvg) {
    return b.candidate.ratingAvg - a.candidate.ratingAvg;
  }

  const aTime = a.candidate.lastActiveAt
    ? new Date(a.candidate.lastActiveAt).getTime()
    : 0;
  const bTime = b.candidate.lastActiveAt
    ? new Date(b.candidate.lastActiveAt).getTime()
    : 0;
  if (bTime !== aTime) return bTime - aTime;

  // Lexicographic UUID comparison — ensures stable, deterministic output.
  return a.candidate.teacherProfileId < b.candidate.teacherProfileId ? -1 : 1;
}

// ── Main Scorer ───────────────────────────────────────────────────────────────

// Pure function: no IO, no randomness, same input always produces same output.
export function scoreAndRankCandidates(
  filtered: FilteredCandidate[],
  intake: IntakeWithContext,
  fallbackPhase: FallbackPhase,
): ScoredMatch[] {
  const scored: ScoredMatch[] = filtered.map((candidate) => {
    const subjectMatch = candidate._bestSubjectMatch;
    const overlap = candidate._availabilityOverlap;

    const expertise    = scoreExpertise(subjectMatch);
    const availability = scoreAvailability(overlap);
    const price        = scorePrice(candidate.hourlyRate, intake.budgetMin, intake.budgetMax);
    const reliability  = scoreReliability(candidate.ratingAvg, candidate.ratingCount);
    const activity     = scoreActivity(candidate.lastActiveAt);

    const total =
      expertise    * WEIGHTS.expertise +
      availability * WEIGHTS.availability +
      price        * WEIGHTS.price +
      reliability  * WEIGHTS.reliability +
      activity     * WEIGHTS.activity;

    const scoreBreakdown: ScoreBreakdown = {
      expertise,
      availability,
      price,
      reliability,
      activity,
      total,
    };

    return {
      candidate,
      subjectMatch,
      score: total,
      scoreBreakdown,
      availabilityOverlap: overlap,
      reason: buildReason(subjectMatch, overlap, candidate.ratingAvg, candidate.ratingCount),
      fallbackPhase,
    };
  });

  return scored.sort(compareScoredMatches);
}
