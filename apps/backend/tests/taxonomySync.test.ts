import { describe, expect, it } from 'vitest';

// Cross-workspace imports: the guard's whole point is to compare the canonical
// taxonomy against the two frontend subject catalogs that feed subject-name
// resolution. taxonomy-data.mjs is side-effect-free (no Supabase / env reads),
// and both frontend files are pure constant modules, so importing them here is safe.
import { canonicalSubjects } from '../../../scripts/taxonomy-data.mjs';
import { subjectsByLevel } from '../../frontend/src/features/matching/data/subjectsByLevel';
import { SUBJECTS_BY_LEVEL } from '../../frontend/src/content/teacherOnboardingContent';

const canonicalNames = new Set(canonicalSubjects.map((subject) => subject.name));

function offeredSubjects(byLevel: Record<string, string[]>): string[] {
  return [...new Set(Object.values(byLevel).flat())];
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
