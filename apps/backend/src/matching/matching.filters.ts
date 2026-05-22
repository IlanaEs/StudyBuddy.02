// Pure filter functions only. No DB access. No scoring decisions.

import type {
  AvailabilityOverlap,
  AvailabilitySlot,
  FallbackPhase,
  FilteredCandidate,
  IntakeWithContext,
  MatchCandidate,
  PreferredTimeRange,
  SubjectMatch,
} from './matching.types.js';

// ── Thresholds ────────────────────────────────────────────────────────────────

export const PARTIAL_OVERLAP_THRESHOLD_MINUTES = 30;
export const FULL_OVERLAP_THRESHOLD_MINUTES = 60; // standard lesson duration
export const MAX_SCHEDULED_LESSONS_PER_WEEK = 20;
export const ACTIVITY_STALENESS_DAYS = 30; // teachers unseen for longer are hard-rejected

// ── Availability Overlap ──────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return h * 60 + m;
}

function slotOverlapMinutes(
  slotStart: string,
  slotEnd: string,
  preferredStart: string,
  preferredEnd: string,
): number {
  const ss = timeToMinutes(slotStart);
  const se = timeToMinutes(slotEnd);
  const ps = timeToMinutes(preferredStart);
  const pe = timeToMinutes(preferredEnd);
  return Math.max(0, Math.min(se, pe) - Math.max(ss, ps));
}

export function calculateAvailabilityOverlap(
  slots: AvailabilitySlot[],
  preferredDays: number[] | null,
  preferredTimeRanges: PreferredTimeRange[] | null,
): AvailabilityOverlap {
  // No preferences stated → any availability is compatible.
  // Return a synthetic "full overlap" so the teacher isn't penalized.
  if (!preferredDays && !preferredTimeRanges) {
    const hasSlots = slots.length > 0;
    return {
      totalMinutes: hasSlots ? FULL_OVERLAP_THRESHOLD_MINUTES : 0,
      matchingSlots: [],
      isFullOverlap: hasSlots,
      isPartialOverlap: false,
      isValid: hasSlots,
    };
  }

  // When time ranges are absent, treat the whole day as preferred.
  const effectiveRanges: PreferredTimeRange[] =
    preferredTimeRanges ?? [{ start: '00:00', end: '23:59' }];

  // Group teacher slots by day for O(n) lookups.
  const slotsByDay = new Map<number, AvailabilitySlot[]>();
  for (const slot of slots) {
    if (!slotsByDay.has(slot.dayOfWeek)) slotsByDay.set(slot.dayOfWeek, []);
    slotsByDay.get(slot.dayOfWeek)!.push(slot);
  }

  // When days are absent, check against all days the teacher is available.
  const effectiveDays: number[] = preferredDays ?? [...slotsByDay.keys()];

  const matchingSlots: { dayOfWeek: number; overlapMinutes: number }[] = [];
  let totalMinutes = 0;

  for (const day of effectiveDays) {
    const daySlots = slotsByDay.get(day) ?? [];
    let dayOverlap = 0;

    for (const slot of daySlots) {
      for (const range of effectiveRanges) {
        dayOverlap += slotOverlapMinutes(
          slot.startTime,
          slot.endTime,
          range.start,
          range.end,
        );
      }
    }

    if (dayOverlap > 0) {
      matchingSlots.push({ dayOfWeek: day, overlapMinutes: dayOverlap });
      totalMinutes += dayOverlap;
    }
  }

  const isFullOverlap = totalMinutes >= FULL_OVERLAP_THRESHOLD_MINUTES;
  const isPartialOverlap =
    totalMinutes >= PARTIAL_OVERLAP_THRESHOLD_MINUTES && !isFullOverlap;
  const isValid = totalMinutes >= PARTIAL_OVERLAP_THRESHOLD_MINUTES;

  return { totalMinutes, matchingSlots, isFullOverlap, isPartialOverlap, isValid };
}

// ── Level Matching ────────────────────────────────────────────────────────────

// Returns the best-fitting subject row for the intake level, or null if none qualify.
//
// Priority:
//   1. Exact level match (intake.level === subject.level)
//   2. Flexible teacher (subject.level is null — teaches any level)
//   3. Any subject row when intake has no level preference
export function findBestLevelMatch(
  candidate: MatchCandidate,
  intake: IntakeWithContext,
): SubjectMatch | null {
  if (!intake.level) {
    // No preference — prefer a row with an explicit level (more data for scoring)
    // over a null-level row, but accept either.
    return (
      candidate.subjectMatches.find((m) => m.level !== null) ??
      candidate.subjectMatches[0] ??
      null
    );
  }

  return (
    candidate.subjectMatches.find((m) => m.level === intake.level) ??
    candidate.subjectMatches.find((m) => m.level === null) ??
    null
  );
}

// ── Individual Hard Filters ───────────────────────────────────────────────────

function isLocationCompatible(
  candidate: MatchCandidate,
  intake: IntakeWithContext,
): boolean {
  const t = candidate.locationType;
  const i = intake.locationPreference;

  if (i === 'online') {
    return t === 'online' || t === 'both';
  }

  if (i === 'frontal') {
    if (t !== 'frontal' && t !== 'both') return false;
    // City must match for frontal lessons.
    if (!candidate.city || !intake.city) return false;
    return candidate.city.trim().toLowerCase() === intake.city.trim().toLowerCase();
  }

  // intake is 'both' → teacher location is irrelevant
  return true;
}

function isBudgetCompatible(
  candidate: MatchCandidate,
  intake: IntakeWithContext,
): boolean {
  const { budgetMin, budgetMax } = intake;
  const rate = candidate.hourlyRate;

  if (budgetMin === null && budgetMax === null) return true; // no constraint
  if (budgetMax === null) return rate >= budgetMin!;         // only floor
  if (budgetMin === null) return rate <= budgetMax;          // only ceiling
  return rate >= budgetMin && rate <= budgetMax;             // BETWEEN
}

function hasActiveAvailability(candidate: MatchCandidate): boolean {
  return candidate.availabilitySlots.length > 0;
}

function isNotSaturated(candidate: MatchCandidate): boolean {
  return candidate.scheduledLessonsThisWeek <= MAX_SCHEDULED_LESSONS_PER_WEEK;
}

// Hard rejection for stale or never-seen-active teachers.
// Null lastActiveAt means the teacher has never been marked active — reject.
// Teachers unseen for > ACTIVITY_STALENESS_DAYS days are also rejected regardless
// of their score; matching must not surface teachers who are no longer responsive.
function isRecentlyActive(candidate: MatchCandidate): boolean {
  if (!candidate.lastActiveAt) return false;
  const daysSince =
    (Date.now() - new Date(candidate.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince <= ACTIVITY_STALENESS_DAYS;
}

// ── Filter Context ────────────────────────────────────────────────────────────

// Controls which constraints are relaxed in each fallback phase.
export type FilterContext = {
  phase: FallbackPhase;
  relaxBudget?: boolean;  // Phase 2+: ignore budget bounds
  forceOnline?: boolean;  // Phase 3+: treat intake as online regardless of location_preference
};

// ── Master Filter ─────────────────────────────────────────────────────────────

// Applies all hard filters and computes availability overlap for passing candidates.
// Returns only candidates that survive every active constraint.
export function applyHardFilters(
  candidates: MatchCandidate[],
  intake: IntakeWithContext,
  context: FilterContext = { phase: 'strict' },
): FilteredCandidate[] {
  const effectiveIntake: IntakeWithContext = context.forceOnline
    ? { ...intake, locationPreference: 'online' as const, city: null }
    : intake;

  const results: FilteredCandidate[] = [];

  for (const candidate of candidates) {
    // Level — must find a compatible subject row
    const bestMatch = findBestLevelMatch(candidate, effectiveIntake);
    if (!bestMatch) continue;

    // Location
    if (!isLocationCompatible(candidate, effectiveIntake)) continue;

    // Budget (skipped in budget_expansion and later phases)
    if (!context.relaxBudget && !isBudgetCompatible(candidate, effectiveIntake)) continue;

    // Active availability slots must exist
    if (!hasActiveAvailability(candidate)) continue;

    // Saturation — teacher not overloaded
    if (!isNotSaturated(candidate)) continue;

    // Activity staleness — 30-day hard cutoff, null lastActiveAt always rejected
    if (!isRecentlyActive(candidate)) continue;

    // Availability overlap
    const overlap = calculateAvailabilityOverlap(
      candidate.availabilitySlots,
      effectiveIntake.preferredDays,
      effectiveIntake.preferredTimeRanges,
    );

    // 30-minute minimum is non-negotiable across all phases, including partial_results.
    // partial_results may return fewer than 3 candidates but never relaxes this floor.
    if (!overlap.isValid) continue;

    results.push({ ...candidate, _bestSubjectMatch: bestMatch, _availabilityOverlap: overlap });
  }

  return results;
}
