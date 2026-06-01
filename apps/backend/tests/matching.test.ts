import { describe, expect, it } from 'vitest';

import {
  ACTIVITY_STALENESS_DAYS,
  applyHardFilters,
  calculateAvailabilityOverlap,
  FULL_OVERLAP_THRESHOLD_MINUTES,
  MAX_SCHEDULED_LESSONS_PER_WEEK,
  PARTIAL_OVERLAP_THRESHOLD_MINUTES,
} from '../src/matching/matching.filters.js';
import { scoreAndRankCandidates } from '../src/matching/matching.scoring.js';
import type {
  AvailabilitySlot,
  FilteredCandidate,
  IntakeWithContext,
  MatchCandidate,
} from '../src/matching/matching.types.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeSlot(dayOfWeek: number, startTime: string, endTime: string): AvailabilitySlot {
  return { dayOfWeek, startTime, endTime, isActive: true };
}

function makeCandidate(overrides: Partial<MatchCandidate> = {}): MatchCandidate {
  return {
    teacherProfileId: 'teacher-uuid-1',
    userId: 'user-uuid-1',
    hourlyRate: 100,
    locationType: 'online',
    city: null,
    ratingAvg: 4.0,
    ratingCount: 10,
    isVerified: true,
    isActive: true,
    lastActiveAt: new Date().toISOString(),
    userStatus: 'active',
    subjectMatches: [{ subjectId: 'subject-uuid', level: 'high', yearsExperience: 5 }],
    availabilitySlots: [makeSlot(1, '09:00', '17:00')], // Monday, full day
    scheduledLessonsThisWeek: 0,
    ...overrides,
  };
}

function makeIntake(overrides: Partial<IntakeWithContext> = {}): IntakeWithContext {
  return {
    id: 'intake-uuid',
    studentId: 'student-uuid',
    createdByUserId: 'user-uuid-parent',
    subjectId: 'subject-uuid',
    level: 'high',
    goal: null,
    locationPreference: 'online',
    city: null,
    budgetMin: null,
    budgetMax: null,
    preferredDays: null,
    preferredTimeRanges: null,
    learningStyle: null,
    urgency: null,
    status: 'open',
    ...overrides,
  };
}

function makeFilteredCandidate(
  candidate: MatchCandidate,
  overrides: Partial<FilteredCandidate> = {},
): FilteredCandidate {
  return {
    ...candidate,
    _bestSubjectMatch: candidate.subjectMatches[0]!,
    _availabilityOverlap: calculateAvailabilityOverlap(
      candidate.availabilitySlots,
      null,
      null,
    ),
    ...overrides,
  };
}

// ── calculateAvailabilityOverlap ──────────────────────────────────────────────

describe('calculateAvailabilityOverlap', () => {
  it('returns full overlap when no preferences and teacher has slots', () => {
    const result = calculateAvailabilityOverlap([makeSlot(1, '09:00', '17:00')], null, null);
    expect(result.isValid).toBe(true);
    expect(result.isFullOverlap).toBe(true);
    expect(result.totalMinutes).toBe(FULL_OVERLAP_THRESHOLD_MINUTES);
  });

  it('returns invalid when no preferences and teacher has no slots', () => {
    const result = calculateAvailabilityOverlap([], null, null);
    expect(result.isValid).toBe(false);
    expect(result.totalMinutes).toBe(0);
  });

  it('counts overlap minutes correctly for a matching day and range', () => {
    // Teacher: Monday 09:00–17:00. Student prefers Monday 10:00–12:00 → 120 min.
    const result = calculateAvailabilityOverlap(
      [makeSlot(1, '09:00', '17:00')],
      [1],
      [{ start: '10:00', end: '12:00' }],
    );
    expect(result.totalMinutes).toBe(120);
    expect(result.isFullOverlap).toBe(true);
    expect(result.isPartialOverlap).toBe(false);
    expect(result.isValid).toBe(true);
  });

  it('returns zero overlap when preferred day has no teacher slot', () => {
    // Teacher available Monday (1). Student prefers Wednesday (3).
    const result = calculateAvailabilityOverlap(
      [makeSlot(1, '09:00', '17:00')],
      [3],
      null,
    );
    expect(result.totalMinutes).toBe(0);
    expect(result.isValid).toBe(false);
  });

  it('classifies partial overlap correctly (30–59 min)', () => {
    // Teacher: Monday 09:00–09:45. Student: Monday 09:00–12:00 → 45 min overlap.
    const result = calculateAvailabilityOverlap(
      [makeSlot(1, '09:00', '09:45')],
      [1],
      [{ start: '09:00', end: '12:00' }],
    );
    expect(result.totalMinutes).toBe(45);
    expect(result.isPartialOverlap).toBe(true);
    expect(result.isFullOverlap).toBe(false);
    expect(result.isValid).toBe(true);
  });

  it('classifies invalid overlap correctly (< 30 min)', () => {
    // Teacher: Monday 09:00–09:20. Student: Monday 09:00–12:00 → 20 min overlap.
    const result = calculateAvailabilityOverlap(
      [makeSlot(1, '09:00', '09:20')],
      [1],
      [{ start: '09:00', end: '12:00' }],
    );
    expect(result.totalMinutes).toBe(20);
    expect(result.isValid).toBe(false);
    expect(result.isPartialOverlap).toBe(false);
    expect(result.isFullOverlap).toBe(false);
  });

  it('accumulates overlap across multiple preferred days', () => {
    // Teacher: Mon+Wed 09:00–10:00 (60 min each). Student prefers both.
    const result = calculateAvailabilityOverlap(
      [makeSlot(1, '09:00', '10:00'), makeSlot(3, '09:00', '10:00')],
      [1, 3],
      [{ start: '09:00', end: '12:00' }],
    );
    expect(result.totalMinutes).toBe(120); // 60 + 60
    expect(result.matchingSlots).toHaveLength(2);
  });

  it(`uses FULL_OVERLAP_THRESHOLD_MINUTES = ${FULL_OVERLAP_THRESHOLD_MINUTES}`, () => {
    expect(FULL_OVERLAP_THRESHOLD_MINUTES).toBe(60);
  });

  it(`uses PARTIAL_OVERLAP_THRESHOLD_MINUTES = ${PARTIAL_OVERLAP_THRESHOLD_MINUTES}`, () => {
    expect(PARTIAL_OVERLAP_THRESHOLD_MINUTES).toBe(30);
  });
});

// ── applyHardFilters — location ───────────────────────────────────────────────

describe('applyHardFilters — location compatibility', () => {
  it('passes online teacher for online intake', () => {
    const result = applyHardFilters(
      [makeCandidate({ locationType: 'online' })],
      makeIntake({ locationPreference: 'online' }),
    );
    expect(result).toHaveLength(1);
  });

  it('passes both-type teacher for online intake', () => {
    const result = applyHardFilters(
      [makeCandidate({ locationType: 'both' })],
      makeIntake({ locationPreference: 'online' }),
    );
    expect(result).toHaveLength(1);
  });

  it('rejects frontal-only teacher for online intake', () => {
    const result = applyHardFilters(
      [makeCandidate({ locationType: 'frontal', city: 'Tel Aviv' })],
      makeIntake({ locationPreference: 'online' }),
    );
    expect(result).toHaveLength(0);
  });

  it('passes frontal teacher in same city for frontal intake', () => {
    const result = applyHardFilters(
      [makeCandidate({ locationType: 'frontal', city: 'Tel Aviv' })],
      makeIntake({ locationPreference: 'frontal', city: 'Tel Aviv' }),
    );
    expect(result).toHaveLength(1);
  });

  it('rejects frontal teacher in different city for frontal intake', () => {
    const result = applyHardFilters(
      [makeCandidate({ locationType: 'frontal', city: 'Tel Aviv' })],
      makeIntake({ locationPreference: 'frontal', city: 'Haifa' }),
    );
    expect(result).toHaveLength(0);
  });

  it('rejects frontal teacher with no city for frontal intake', () => {
    const result = applyHardFilters(
      [makeCandidate({ locationType: 'frontal', city: null })],
      makeIntake({ locationPreference: 'frontal', city: 'Tel Aviv' }),
    );
    expect(result).toHaveLength(0);
  });

  it('accepts any teacher location for both intake', () => {
    const candidates = [
      makeCandidate({ teacherProfileId: 'a', locationType: 'online' }),
      makeCandidate({ teacherProfileId: 'b', locationType: 'frontal', city: 'x' }),
      makeCandidate({ teacherProfileId: 'c', locationType: 'both' }),
    ];
    const result = applyHardFilters(candidates, makeIntake({ locationPreference: 'both' }));
    expect(result).toHaveLength(3);
  });

  it('uses forceOnline context to override frontal intake', () => {
    // intake is frontal but context forces online — frontal teacher should now fail
    const result = applyHardFilters(
      [makeCandidate({ locationType: 'frontal', city: 'Tel Aviv' })],
      makeIntake({ locationPreference: 'frontal', city: 'Tel Aviv' }),
      { phase: 'online_fallback', forceOnline: true },
    );
    expect(result).toHaveLength(0);
  });
});

// ── applyHardFilters — budget ─────────────────────────────────────────────────

describe('applyHardFilters — budget compatibility', () => {
  it('passes any rate when both budget bounds are null', () => {
    const result = applyHardFilters(
      [makeCandidate({ hourlyRate: 999 })],
      makeIntake({ budgetMin: null, budgetMax: null }),
    );
    expect(result).toHaveLength(1);
  });

  it('passes when rate equals budget_min (only floor)', () => {
    const result = applyHardFilters(
      [makeCandidate({ hourlyRate: 100 })],
      makeIntake({ budgetMin: 100, budgetMax: null }),
    );
    expect(result).toHaveLength(1);
  });

  it('rejects when rate is below budget_min (only floor)', () => {
    const result = applyHardFilters(
      [makeCandidate({ hourlyRate: 80 })],
      makeIntake({ budgetMin: 100, budgetMax: null }),
    );
    expect(result).toHaveLength(0);
  });

  it('passes when rate equals budget_max (only ceiling)', () => {
    const result = applyHardFilters(
      [makeCandidate({ hourlyRate: 150 })],
      makeIntake({ budgetMin: null, budgetMax: 150 }),
    );
    expect(result).toHaveLength(1);
  });

  it('rejects when rate exceeds budget_max (only ceiling)', () => {
    const result = applyHardFilters(
      [makeCandidate({ hourlyRate: 200 })],
      makeIntake({ budgetMin: null, budgetMax: 150 }),
    );
    expect(result).toHaveLength(0);
  });

  it('passes when rate is within BETWEEN range', () => {
    const result = applyHardFilters(
      [makeCandidate({ hourlyRate: 120 })],
      makeIntake({ budgetMin: 100, budgetMax: 150 }),
    );
    expect(result).toHaveLength(1);
  });

  it('rejects when rate is outside BETWEEN range', () => {
    const result = applyHardFilters(
      [makeCandidate({ hourlyRate: 200 })],
      makeIntake({ budgetMin: 100, budgetMax: 150 }),
    );
    expect(result).toHaveLength(0);
  });

  it('passes budget check when relaxBudget is set', () => {
    const result = applyHardFilters(
      [makeCandidate({ hourlyRate: 500 })],
      makeIntake({ budgetMin: 100, budgetMax: 150 }),
      { phase: 'budget_expansion', relaxBudget: true },
    );
    expect(result).toHaveLength(1);
  });
});

// ── applyHardFilters — level ──────────────────────────────────────────────────

describe('applyHardFilters — level matching', () => {
  it('passes when teacher level matches intake level exactly', () => {
    const result = applyHardFilters(
      [makeCandidate({ subjectMatches: [{ subjectId: 'sid', level: 'high', yearsExperience: 3 }] })],
      makeIntake({ level: 'high' }),
    );
    expect(result).toHaveLength(1);
  });

  it('passes when teacher level is null (flexible teacher)', () => {
    const result = applyHardFilters(
      [makeCandidate({ subjectMatches: [{ subjectId: 'sid', level: null, yearsExperience: 3 }] })],
      makeIntake({ level: 'high' }),
    );
    expect(result).toHaveLength(1);
  });

  it('rejects when teacher level does not match and teacher is not flexible', () => {
    const result = applyHardFilters(
      [makeCandidate({ subjectMatches: [{ subjectId: 'sid', level: 'elementary', yearsExperience: 3 }] })],
      makeIntake({ level: 'high' }),
    );
    expect(result).toHaveLength(0);
  });

  it('passes any level when intake has no level preference', () => {
    const result = applyHardFilters(
      [makeCandidate({ subjectMatches: [{ subjectId: 'sid', level: 'elementary', yearsExperience: 3 }] })],
      makeIntake({ level: null }),
    );
    expect(result).toHaveLength(1);
  });

  it('rejects candidate with empty subjectMatches', () => {
    const result = applyHardFilters(
      [makeCandidate({ subjectMatches: [] })],
      makeIntake({ level: 'high' }),
    );
    expect(result).toHaveLength(0);
  });
});

// ── applyHardFilters — saturation ─────────────────────────────────────────────

describe('applyHardFilters — saturation protection', () => {
  it('passes teacher at exactly the limit', () => {
    const result = applyHardFilters(
      [makeCandidate({ scheduledLessonsThisWeek: MAX_SCHEDULED_LESSONS_PER_WEEK })],
      makeIntake(),
    );
    expect(result).toHaveLength(1);
  });

  it('rejects teacher one lesson over the limit', () => {
    const result = applyHardFilters(
      [makeCandidate({ scheduledLessonsThisWeek: MAX_SCHEDULED_LESSONS_PER_WEEK + 1 })],
      makeIntake(),
    );
    expect(result).toHaveLength(0);
  });

  it(`uses MAX_SCHEDULED_LESSONS_PER_WEEK = ${MAX_SCHEDULED_LESSONS_PER_WEEK}`, () => {
    expect(MAX_SCHEDULED_LESSONS_PER_WEEK).toBe(20);
  });
});

// ── applyHardFilters — availability ───────────────────────────────────────────

describe('applyHardFilters — availability existence', () => {
  it('rejects teacher with no active availability slots', () => {
    const result = applyHardFilters(
      [makeCandidate({ availabilitySlots: [] })],
      makeIntake(),
    );
    expect(result).toHaveLength(0);
  });
});

// ── scoreAndRankCandidates — deterministic ordering ───────────────────────────

describe('scoreAndRankCandidates — deterministic ordering', () => {
  const intake = makeIntake({ budgetMin: 50, budgetMax: 200 });

  it('ranks higher score first', () => {
    const highRated = makeFilteredCandidate(
      makeCandidate({ teacherProfileId: 'a', ratingAvg: 5.0, ratingCount: 20 }),
    );
    const lowRated = makeFilteredCandidate(
      makeCandidate({ teacherProfileId: 'b', ratingAvg: 1.0, ratingCount: 1 }),
    );
    const result = scoreAndRankCandidates([lowRated, highRated], intake, 'strict');
    expect(result[0]!.candidate.teacherProfileId).toBe('a');
  });

  it('breaks score ties by availability overlap descending', () => {
    // Both have identical scores except for overlap.
    const highOverlap = makeFilteredCandidate(
      makeCandidate({ teacherProfileId: 'a', ratingAvg: 4.0, ratingCount: 10, availabilitySlots: [makeSlot(1, '09:00', '17:00')] }),
      {
        _availabilityOverlap: {
          totalMinutes: 480,
          matchingSlots: [],
          isFullOverlap: true,
          isPartialOverlap: false,
          isValid: true,
        },
      },
    );
    const lowOverlap = makeFilteredCandidate(
      makeCandidate({ teacherProfileId: 'b', ratingAvg: 4.0, ratingCount: 10, availabilitySlots: [makeSlot(1, '09:00', '10:00')] }),
      {
        _availabilityOverlap: {
          totalMinutes: 60,
          matchingSlots: [],
          isFullOverlap: true,
          isPartialOverlap: false,
          isValid: true,
        },
      },
    );
    const result = scoreAndRankCandidates([lowOverlap, highOverlap], intake, 'strict');
    expect(result[0]!.candidate.teacherProfileId).toBe('a');
  });

  it('uses teacherProfileId as a stable tiebreaker (UUID ascending)', () => {
    // Construct two candidates that are identical in every scored dimension.
    const base: Partial<MatchCandidate> = {
      ratingAvg: 4.0,
      ratingCount: 10,
      hourlyRate: 100,
      lastActiveAt: '2026-05-01T12:00:00Z',
      availabilitySlots: [makeSlot(1, '09:00', '17:00')],
      subjectMatches: [{ subjectId: 'sid', level: 'high', yearsExperience: 5 }],
    };
    const overlap = {
      totalMinutes: FULL_OVERLAP_THRESHOLD_MINUTES,
      matchingSlots: [],
      isFullOverlap: true,
      isPartialOverlap: false,
      isValid: true,
    };
    const candidateA = makeFilteredCandidate(
      makeCandidate({ ...base, teacherProfileId: 'aaa-uuid' }),
      { _availabilityOverlap: overlap },
    );
    const candidateB = makeFilteredCandidate(
      makeCandidate({ ...base, teacherProfileId: 'zzz-uuid' }),
      { _availabilityOverlap: overlap },
    );

    const result1 = scoreAndRankCandidates([candidateA, candidateB], intake, 'strict');
    const result2 = scoreAndRankCandidates([candidateB, candidateA], intake, 'strict');

    // Regardless of input order, 'aaa' always sorts before 'zzz'
    expect(result1[0]!.candidate.teacherProfileId).toBe('aaa-uuid');
    expect(result2[0]!.candidate.teacherProfileId).toBe('aaa-uuid');
  });

  it('attaches the correct fallback phase to each result', () => {
    const candidate = makeFilteredCandidate(makeCandidate());
    const result = scoreAndRankCandidates([candidate], intake, 'budget_expansion');
    expect(result[0]!.fallbackPhase).toBe('budget_expansion');
  });

  it('returns an empty array when given no candidates', () => {
    expect(scoreAndRankCandidates([], intake, 'strict')).toEqual([]);
  });
});

// ── scoreAndRankCandidates — reliability formula ──────────────────────────────

describe('scoreAndRankCandidates — reliability scoring', () => {
  const intake = makeIntake();

  it('applies confidence_factor: new teacher with high rating scores lower than established one', () => {
    // Teacher A: 5.0 avg, only 1 review (low confidence)
    const newTeacher = makeFilteredCandidate(
      makeCandidate({ teacherProfileId: 'new', ratingAvg: 5.0, ratingCount: 1 }),
    );
    // Teacher B: 4.5 avg, 20 reviews (full confidence)
    const established = makeFilteredCandidate(
      makeCandidate({ teacherProfileId: 'est', ratingAvg: 4.5, ratingCount: 20 }),
    );
    const result = scoreAndRankCandidates([newTeacher, established], intake, 'strict');
    const newScore = result.find((r) => r.candidate.teacherProfileId === 'new')!.scoreBreakdown.reliability;
    const estScore = result.find((r) => r.candidate.teacherProfileId === 'est')!.scoreBreakdown.reliability;
    // new: 5.0 * (1/10) / 5 = 0.10; est: 4.5 * 1.0 / 5 = 0.90
    expect(estScore).toBeGreaterThan(newScore);
    expect(newScore).toBeCloseTo(0.10, 2);
    expect(estScore).toBeCloseTo(0.90, 2);
  });

  it('produces score components that sum correctly to the total', () => {
    const candidate = makeFilteredCandidate(makeCandidate());
    const [result] = scoreAndRankCandidates([candidate], intake, 'strict');
    const { expertise, availability, price, reliability, activity, total } = result!.scoreBreakdown;
    const computed = expertise * 0.25 + availability * 0.25 + price * 0.10 + reliability * 0.30 + activity * 0.10;
    expect(total).toBeCloseTo(computed, 10);
  });
});

// ── QA Fix 1: online_fallback must not override frontal intakes ───────────────

describe('applyHardFilters — online_fallback safety for frontal intakes', () => {
  it('passes frontal teacher for frontal intake when forceOnline is NOT set', () => {
    // The service sets forceOnline=false for frontal intakes via makeEffectiveContext.
    // This test verifies that without forceOnline, a frontal teacher is not incorrectly rejected.
    const result = applyHardFilters(
      [makeCandidate({ locationType: 'frontal', city: 'Tel Aviv' })],
      makeIntake({ locationPreference: 'frontal', city: 'Tel Aviv' }),
      { phase: 'online_fallback' }, // forceOnline absent — as service produces for frontal intake
    );
    expect(result).toHaveLength(1);
  });

  it('rejects frontal teacher when forceOnline IS set — documents why service must suppress it for frontal', () => {
    // forceOnline converts the effective intake to online, causing frontal-only
    // teachers to fail the location filter. This is the bug the service fix prevents.
    const result = applyHardFilters(
      [makeCandidate({ locationType: 'frontal', city: 'Tel Aviv' })],
      makeIntake({ locationPreference: 'frontal', city: 'Tel Aviv' }),
      { phase: 'online_fallback', forceOnline: true },
    );
    expect(result).toHaveLength(0);
  });

  it('allows forceOnline for non-frontal intakes (online fallback works as intended)', () => {
    // For an 'online' intake with forceOnline=true: behaviour is unchanged.
    const result = applyHardFilters(
      [makeCandidate({ locationType: 'online' })],
      makeIntake({ locationPreference: 'online' }),
      { phase: 'online_fallback', forceOnline: true },
    );
    expect(result).toHaveLength(1);
  });
});

// ── QA Fix 2: partial_results must not drop below 30-minute minimum ───────────

describe('applyHardFilters — partial_results minimum overlap floor', () => {
  it('rejects candidate with 29-minute overlap even in partial_results phase', () => {
    // Teacher slot is 09:00–09:29 against preferred 09:00–12:00 → 29 min overlap.
    const result = applyHardFilters(
      [makeCandidate({ availabilitySlots: [makeSlot(1, '09:00', '09:29')] })],
      makeIntake({
        preferredDays: [1],
        preferredTimeRanges: [{ start: '09:00', end: '12:00' }],
      }),
      { phase: 'partial_results' },
    );
    expect(result).toHaveLength(0);
  });

  it('passes candidate with exactly 30-minute overlap in partial_results phase', () => {
    // Teacher slot is 09:00–09:30 → exactly 30 min overlap — must still pass.
    const result = applyHardFilters(
      [makeCandidate({ availabilitySlots: [makeSlot(1, '09:00', '09:30')] })],
      makeIntake({
        preferredDays: [1],
        preferredTimeRanges: [{ start: '09:00', end: '12:00' }],
      }),
      { phase: 'partial_results' },
    );
    expect(result).toHaveLength(1);
  });

  it('rejects candidate with zero overlap in partial_results phase', () => {
    const result = applyHardFilters(
      [makeCandidate({ availabilitySlots: [makeSlot(3, '09:00', '17:00')] })], // Wednesday
      makeIntake({
        preferredDays: [1], // Monday only
        preferredTimeRanges: [{ start: '09:00', end: '12:00' }],
      }),
      { phase: 'partial_results' },
    );
    expect(result).toHaveLength(0);
  });
});

// ── QA Fix 3: activity staleness hard filter ──────────────────────────────────

describe('applyHardFilters — activity staleness hard filter', () => {
  it(`uses ACTIVITY_STALENESS_DAYS = ${ACTIVITY_STALENESS_DAYS}`, () => {
    expect(ACTIVITY_STALENESS_DAYS).toBe(30);
  });

  it('rejects teacher with lastActiveAt = null', () => {
    const result = applyHardFilters(
      [makeCandidate({ lastActiveAt: null })],
      makeIntake(),
    );
    expect(result).toHaveLength(0);
  });

  it('rejects teacher last active more than 30 days ago', () => {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 31);
    const result = applyHardFilters(
      [makeCandidate({ lastActiveAt: staleDate.toISOString() })],
      makeIntake(),
    );
    expect(result).toHaveLength(0);
  });

  it('rejects teacher last active exactly 31 days ago', () => {
    const staleDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const result = applyHardFilters(
      [makeCandidate({ lastActiveAt: staleDate.toISOString() })],
      makeIntake(),
    );
    expect(result).toHaveLength(0);
  });

  it('passes teacher last active within the 30-day window', () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 15);
    const result = applyHardFilters(
      [makeCandidate({ lastActiveAt: recentDate.toISOString() })],
      makeIntake(),
    );
    expect(result).toHaveLength(1);
  });

  it('passes teacher active today', () => {
    const result = applyHardFilters(
      [makeCandidate({ lastActiveAt: new Date().toISOString() })],
      makeIntake(),
    );
    expect(result).toHaveLength(1);
  });
});
