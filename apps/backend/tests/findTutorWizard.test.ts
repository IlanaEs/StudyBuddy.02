import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/studentIntakes/studentIntakes.repository.js', () => ({
  createStudentIntake: vi.fn(),
  findSubjectIdByName: vi.fn(),
  getStudentIdByUserId: vi.fn(),
  getLatestStudentIntakeByStudentId: vi.fn(),
}));
vi.mock('../src/auth/ownership.js', () => ({
  assertStudentAccess: vi.fn(),
}));

import { createIntake, getMyLatestIntake } from '../src/studentIntakes/studentIntakes.service.js';
import {
  createStudentIntake,
  findSubjectIdByName,
  getLatestStudentIntakeByStudentId,
  getStudentIdByUserId,
} from '../src/studentIntakes/studentIntakes.repository.js';
import { academicRepositoryRequestSchema } from '../src/academicRepositories/academicRepositories.validation.js';
import type { LocalUser } from '../src/auth/authTypes.js';

const student: LocalUser = {
  id: 'user-1',
  supabase_auth_user_id: 'auth-1',
  email: 's@example.com',
  role: 'student',
  full_name: 'דנה',
  status: 'active',
};

const baseBody = {
  student_id: 'stu-1',
  subject_name: 'מתמטיקה',
  level: 'י׳',
  goal: 'ongoing',
  location_preference: 'online' as const,
  budget_min: 80,
  budget_max: 150,
  preferred_days: [0, 2],
  preferred_time_ranges: [{ start: '16:00', end: '18:00' }],
  soft_criteria: { teacher_gender: 'female' as const, fast_pace: true, adhd_experience: false, inclusive_approach: true },
};

beforeEach(() => vi.clearAllMocks());

describe('createIntake — soft_criteria persistence', () => {
  it('persists soft_criteria on a canonical subject', async () => {
    vi.mocked(findSubjectIdByName).mockResolvedValue('subj-1');
    vi.mocked(createStudentIntake).mockResolvedValue({ id: 'in-1', studentId: 'stu-1', subjectId: 'subj-1', status: 'open' });

    await createIntake(baseBody, student);

    expect(createStudentIntake).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: 'stu-1',
        subjectId: 'subj-1',
        softCriteria: { teacher_gender: 'female', fast_pace: true, adhd_experience: false, inclusive_approach: true },
      }),
    );
  });

  it('422s an off-taxonomy subject (never submits)', async () => {
    vi.mocked(findSubjectIdByName).mockResolvedValue(null);
    await expect(createIntake(baseBody, student)).rejects.toMatchObject({ statusCode: 422 });
    expect(createStudentIntake).not.toHaveBeenCalled();
  });
});

describe('getMyLatestIntake — prefill', () => {
  it('returns null when the student has no profile', async () => {
    vi.mocked(getStudentIdByUserId).mockResolvedValue(null);
    expect(await getMyLatestIntake(student)).toBeNull();
    expect(getLatestStudentIntakeByStudentId).not.toHaveBeenCalled();
  });

  it('returns the latest intake prefill for the student', async () => {
    vi.mocked(getStudentIdByUserId).mockResolvedValue('stu-1');
    const prefill = {
      student_id: 'stu-1',
      subject_name: 'פיזיקה',
      level: 'י״א',
      goal: 'exam',
      budget_min: 100,
      budget_max: 200,
      preferred_days: [1, 3],
      preferred_time_ranges: [{ start: '17:00', end: '19:00' }],
      soft_criteria: { fast_pace: true },
    };
    vi.mocked(getLatestStudentIntakeByStudentId).mockResolvedValue(prefill);

    expect(await getMyLatestIntake(student)).toEqual(prefill);
  });
});

describe('academic_repository_requests accepts subject', () => {
  it('validates a subject request', () => {
    const parsed = academicRepositoryRequestSchema.safeParse({
      body: { repository_type: 'subject', requested_name: 'אסטרופיזיקה' },
    });
    expect(parsed.success).toBe(true);
  });
});
