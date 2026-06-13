import { describe, expect, it } from 'vitest';

// Cross-workspace imports: the guard's whole point is to compare the canonical
// taxonomy against the two frontend subject catalogs that feed subject-name
// resolution. taxonomy-data.mjs is side-effect-free (no Supabase / env reads),
// and both frontend files are pure constant modules, so importing them here is safe.
import { canonicalSubjects, canonicalSubjectsByBand } from '../../../scripts/taxonomy-data.mjs';
import { demoTeachers } from '../../../scripts/demo-teachers-data.mjs';
import { subjectsByLevel } from '../../frontend/src/features/matching/data/subjectsByLevel';
import { SUBJECTS_BY_LEVEL } from '../../frontend/src/content/teacherOnboardingContent';

const canonicalNames = new Set(canonicalSubjects.map((subject) => subject.name));

// Every subject any demo teacher carries (scripts/demo-teachers-data.mjs). The
// roster teaches level=null (every band), so coverage is band-agnostic: an
// offered subject is "covered" iff some teacher holds it.
const seedTeacherSubjects = new Set(
  demoTeachers.flatMap((teacher) => teacher.subjects.map((subject) => subject.name)),
);

function offeredSubjects(byLevel: Record<string, string[]>): string[] {
  return [...new Set(Object.values(byLevel).flat())];
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

describe('taxonomy sync guard', () => {
  // The wizard offers subjects that the backend resolves to subjects.id. Any
  // value missing from the canonical taxonomy fails resolution: the student path
  // 422s (ilike), the teacher path silently drops the row (.in). Either way the
  // UI must never offer a subject the backend cannot resolve.
  it('student wizard (subjectsByLevel) is a subset of the canonical taxonomy', () => {
    const missing = offeredSubjects(subjectsByLevel).filter((name) => !canonicalNames.has(name));
    expect(
      missing,
      `student wizard subjects missing from canonicalSubjects (scripts/taxonomy-data.mjs): ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('teacher onboarding (SUBJECTS_BY_LEVEL) is a subset of the canonical taxonomy', () => {
    const missing = offeredSubjects(SUBJECTS_BY_LEVEL).filter((name) => !canonicalNames.has(name));
    expect(
      missing,
      `teacher onboarding subjects missing from canonicalSubjects (scripts/taxonomy-data.mjs): ${missing.join(', ')}`,
    ).toEqual([]);
  });

  // The whole point of the single origin: a teacher and a student at the same
  // band must see the IDENTICAL set, or matching (which joins on subject_id)
  // silently returns zero. Both FE catalogs are thin re-exports of
  // canonicalSubjectsByBand today; this fails CI if anyone re-forks them into a
  // divergent literal.
  it('both wizard catalogs are band-for-band identical to the canonical band map', () => {
    const bands = sortedUnique([
      ...Object.keys(canonicalSubjectsByBand),
      ...Object.keys(subjectsByLevel),
      ...Object.keys(SUBJECTS_BY_LEVEL),
    ]);
    for (const band of bands) {
      const origin = sortedUnique(canonicalSubjectsByBand[band as keyof typeof canonicalSubjectsByBand] ?? []);
      expect(sortedUnique(subjectsByLevel[band] ?? []), `student wizard differs from origin at band "${band}"`).toEqual(origin);
      expect(sortedUnique(SUBJECTS_BY_LEVEL[band] ?? []), `teacher wizard differs from origin at band "${band}"`).toEqual(origin);
    }
  });

  // Coverage floor: a band must never offer a subject no demo teacher carries,
  // or that subject is a guaranteed zero-match dead-end in the seeded demo.
  it('every offered subject is carried by >= 1 demo teacher', () => {
    const uncovered = offeredSubjects(canonicalSubjectsByBand).filter((name) => !seedTeacherSubjects.has(name));
    expect(
      uncovered,
      `offered subjects carried by no demo teacher (scripts/demo-teachers-data.mjs) — add seed coverage or drop them: ${uncovered.join(', ')}`,
    ).toEqual([]);
  });

  it('canonical taxonomy has no duplicate subject names', () => {
    const names = canonicalSubjects.map((subject) => subject.name);
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    expect(duplicates, `duplicate canonical subject names: ${[...new Set(duplicates)].join(', ')}`).toEqual([]);
  });

  // Informational only — never fails. Catalog-only subjects (offered by neither
  // wizard) are legitimate; this just surfaces them so drift is visible.
  it('reports canonical subjects offered by no wizard (informational)', () => {
    const offeredAnywhere = new Set([
      ...offeredSubjects(subjectsByLevel),
      ...offeredSubjects(SUBJECTS_BY_LEVEL),
    ]);
    const orphans = canonicalSubjects
      .map((subject) => subject.name)
      .filter((name) => !offeredAnywhere.has(name));
    if (orphans.length > 0) {
      // eslint-disable-next-line no-console
      console.info(`[taxonomy-sync] canonical subjects offered by no wizard (catalog-only): ${orphans.join(', ')}`);
    }
    expect(orphans).toBeInstanceOf(Array);
  });
});
