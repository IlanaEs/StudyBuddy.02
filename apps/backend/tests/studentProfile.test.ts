import { beforeEach, describe, expect, it, vi } from 'vitest';

// GET /api/students/me bootstrap (Quick Matching Wizard gate). It must return a
// clean 404 for a user with no student profile — never a 500, and never coupled
// to /student-intakes/me/latest.
vi.mock('../src/students/students.repository.js', () => ({
  findStudentByUserId: vi.fn(),
  getStudentProfileByUserId: vi.fn(),
  insertChildProfile: vi.fn(),
  insertStudentProfile: vi.fn(),
}));

import { getMyStudentProfile } from '../src/students/students.service.js';
import { getStudentProfileByUserId } from '../src/students/students.repository.js';

beforeEach(() => vi.clearAllMocks());

describe('getMyStudentProfile — Quick Wizard bootstrap', () => {
  it('404s when the user has no student profile (registration incomplete — never 500)', async () => {
    vi.mocked(getStudentProfileByUserId).mockResolvedValue(null);
    await expect(getMyStudentProfile('user-1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns { student_id, full_name, grade_level } when a profile exists', async () => {
    vi.mocked(getStudentProfileByUserId).mockResolvedValue({
      id: 'stu-9',
      full_name: 'דנה',
      grade_level: 'כיתה י',
    });

    expect(await getMyStudentProfile('user-1')).toEqual({
      student_id: 'stu-9',
      full_name: 'דנה',
      grade_level: 'כיתה י',
    });
  });
});
