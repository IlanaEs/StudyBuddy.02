import { describe, expect, it } from 'vitest';

import { applyHardFilters } from '../src/matching/matching.filters.js';
import { normalizeLevelToBand } from '../src/studentIntakes/levelBand.js';
import type { AvailabilitySlot, IntakeWithContext, MatchCandidate } from '../src/matching/matching.types.js';

// ── Fixtures (mirror matching.test.ts so a candidate passes every non-level filter) ──
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
    lastActiveAt: new Date().toISOString(), // recent → passes the staleness filter
    userStatus: 'active',
    subjectMatches: [{ subjectId: 'subject-uuid', level: 'high', yearsExperience: 5 }],
    availabilitySlots: [makeSlot(1, '09:00', '17:00')],
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

const teacherAtLevel = (level: string | null) =>
  makeCandidate({ subjectMatches: [{ subjectId: 'subject-uuid', level, yearsExperience: 3 }] });

// ── Unit: the normalizer ──────────────────────────────────────────────────────
describe('normalizeLevelToBand', () => {
  it('maps elementary Hebrew grades (א׳–ו׳) → elementary', () => {
    for (const g of ['ג׳', 'א', 'כיתה ו', 'כיתה ה׳', 'כיתה א׳']) {
      expect(normalizeLevelToBand(g)).toBe('elementary');
    }
  });

  it('maps middle grades (ז׳–ט׳) → middle', () => {
    for (const g of ['ז׳', 'כיתה ח', 'כיתה ח׳', 'כיתה ט׳']) {
      expect(normalizeLevelToBand(g)).toBe('middle');
    }
  });

  it('maps high grades (י׳/י״א/י״ב) → high', () => {
    for (const g of ['כיתה י', 'כיתה י״א', 'כיתה י״ב', 'יא', 'יב']) {
      expect(normalizeLevelToBand(g)).toBe('high');
    }
  });

  it('maps academic / degree indicators → academic', () => {
    for (const g of ['שנה ב׳', 'שנה א', 'מוסמך', 'דוקטורט', 'סטודנט להנדסה', 'academic']) {
      expect(normalizeLevelToBand(g)).toBe('academic');
    }
  });

  it('passes canonical bands through unchanged (idempotent)', () => {
    expect(normalizeLevelToBand('elementary')).toBe('elementary');
    expect(normalizeLevelToBand('middle')).toBe('middle');
    expect(normalizeLevelToBand('high')).toBe('high');
    expect(normalizeLevelToBand('academic')).toBe('academic');
  });

  it('supports Arabic-numeral grades as a fallback', () => {
    expect(normalizeLevelToBand('3')).toBe('elementary');
    expect(normalizeLevelToBand('8')).toBe('middle');
    expect(normalizeLevelToBand('11')).toBe('high');
  });

  it('returns null for empty / null / unrecognized (no level preference)', () => {
    expect(normalizeLevelToBand(null)).toBeNull();
    expect(normalizeLevelToBand('')).toBeNull();
    expect(normalizeLevelToBand('   ')).toBeNull();
    expect(normalizeLevelToBand('???')).toBeNull();
  });
});

// ── Integration: normalized grade flows through the unchanged level filter ──────
describe('grade-to-band matching (applyHardFilters, level filter unchanged)', () => {
  it('1. a student in grade ג׳ matches a teacher with level elementary', () => {
    const intake = makeIntake({ level: normalizeLevelToBand('ג׳') }); // → elementary
    expect(applyHardFilters([teacherAtLevel('elementary')], intake)).toHaveLength(1);
  });

  it('2. a middle-school grade (כיתה ח׳) matches a teacher with level middle', () => {
    const intake = makeIntake({ level: normalizeLevelToBand('כיתה ח׳') }); // → middle
    expect(applyHardFilters([teacherAtLevel('middle')], intake)).toHaveLength(1);
  });

  it('3. a high-school grade (כיתה י״א) matches a teacher with level high', () => {
    const intake = makeIntake({ level: normalizeLevelToBand('כיתה י״א') }); // → high
    expect(applyHardFilters([teacherAtLevel('high')], intake)).toHaveLength(1);
  });

  it('4. existing band-based intakes still work (high ↔ high)', () => {
    const intake = makeIntake({ level: normalizeLevelToBand('high') }); // → high (idempotent)
    expect(applyHardFilters([teacherAtLevel('high')], intake)).toHaveLength(1);
  });

  it('does NOT loosen the filter: ג׳ (elementary) is still excluded from a high teacher', () => {
    const intake = makeIntake({ level: normalizeLevelToBand('ג׳') }); // → elementary
    expect(applyHardFilters([teacherAtLevel('high')], intake)).toHaveLength(0);
  });

  it('still honors null-level (teaches-anything) teachers across grades', () => {
    const intake = makeIntake({ level: normalizeLevelToBand('כיתה ח׳') }); // → middle
    expect(applyHardFilters([teacherAtLevel(null)], intake)).toHaveLength(1);
  });
});
