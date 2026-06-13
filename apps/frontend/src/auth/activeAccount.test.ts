import { describe, expect, it } from 'vitest';

// S2 regression guards (docs/multi-account-regression-plan.md): a full page load
// — including the return leg of a Google Calendar OAuth redirect — must restore
// the user's persisted account choice instead of snapping back to the identity's
// default (teacher) account. The restore decision is pure and validated against
// the server-fresh accounts list, so a stale/foreign stored id is dropped and
// never sent to the backend (no 403 on the bootstrap /me, no logout loop).

import { findAutoSelectAccount, resolveRestorableAccountId } from './activeAccount';

const TEACHER = { id: 'acct-teacher', status: 'active' as const };
const STUDENT = { id: 'acct-student', status: 'active' as const };
const ACCOUNTS = [TEACHER, STUDENT];

describe('resolveRestorableAccountId', () => {
  it('restores a stored account that differs from the resolved default and is owned + active', () => {
    // The OAuth-return case: backend resolved the default teacher account, but
    // the user had selected their student account before the redirect.
    expect(resolveRestorableAccountId('acct-student', TEACHER, ACCOUNTS)).toBe('acct-student');
  });

  it('returns null when nothing is stored', () => {
    expect(resolveRestorableAccountId(null, TEACHER, ACCOUNTS)).toBeNull();
  });

  it('returns null when the stored id already matches the resolved active account', () => {
    // Also the termination guarantee for the restore re-fetch: once /me runs
    // with the restored header, the ids match and no further restore happens.
    expect(resolveRestorableAccountId('acct-teacher', TEACHER, ACCOUNTS)).toBeNull();
  });

  it('returns null for a stale/foreign stored id that the identity does not own', () => {
    expect(resolveRestorableAccountId('acct-someone-else', TEACHER, ACCOUNTS)).toBeNull();
  });

  it('returns null when the stored account is no longer active', () => {
    const accounts = [TEACHER, { id: 'acct-student', status: 'blocked' as const }];
    expect(resolveRestorableAccountId('acct-student', TEACHER, accounts)).toBeNull();
  });

  it('returns null when no active account was resolved (unprovisioned session)', () => {
    expect(resolveRestorableAccountId('acct-student', null, ACCOUNTS)).toBeNull();
  });

  it('returns null when the accounts list is empty', () => {
    expect(resolveRestorableAccountId('acct-student', TEACHER, [])).toBeNull();
  });
});

// S3 regression guards: a role-gated route visited under the wrong active
// account must auto-select an OWNED account of an allowed role instead of
// bouncing to the active role's dashboard (e.g. /student/dashboard while the
// teacher account is active → enter the owned student account).
describe('findAutoSelectAccount', () => {
  const TEACHER_ACCT = { id: 'acct-teacher', role: 'teacher' as const, status: 'active' as const };
  const STUDENT_ACCT = { id: 'acct-student', role: 'student' as const, status: 'active' as const };
  const PARENT_ACCT = { id: 'acct-parent', role: 'parent' as const, status: 'active' as const };

  it('selects the owned student account for a student-only route when teacher is active', () => {
    const target = findAutoSelectAccount(['student'], 'teacher', [TEACHER_ACCT, STUDENT_ACCT]);
    expect(target).toEqual(STUDENT_ACCT);
  });

  it('selects the owned parent account for a parent-only route when teacher is active', () => {
    const target = findAutoSelectAccount(['parent'], 'teacher', [TEACHER_ACCT, PARENT_ACCT]);
    expect(target).toEqual(PARENT_ACCT);
  });

  it('returns null when the route has no role restriction', () => {
    expect(findAutoSelectAccount(undefined, 'teacher', [TEACHER_ACCT, STUDENT_ACCT])).toBeNull();
  });

  it('returns null when the effective role is already allowed', () => {
    expect(findAutoSelectAccount(['student'], 'student', [TEACHER_ACCT, STUDENT_ACCT])).toBeNull();
  });

  it('returns null when no owned account matches — existing redirect stands', () => {
    expect(findAutoSelectAccount(['student'], 'teacher', [TEACHER_ACCT])).toBeNull();
  });

  it('skips non-active accounts', () => {
    const blockedStudent = { ...STUDENT_ACCT, status: 'blocked' as const };
    expect(findAutoSelectAccount(['student'], 'teacher', [TEACHER_ACCT, blockedStudent])).toBeNull();
  });

  // Student↔parent combinations — auto-select must work between the two
  // non-teacher roles, not only away from teacher.

  it('active student visiting a parent-only route auto-selects the owned parent account', () => {
    const target = findAutoSelectAccount(['parent'], 'student', [STUDENT_ACCT, PARENT_ACCT]);
    expect(target).toEqual(PARENT_ACCT);
  });

  it('active parent visiting a student-only route auto-selects the owned student account', () => {
    const target = findAutoSelectAccount(['student'], 'parent', [STUDENT_ACCT, PARENT_ACCT]);
    expect(target).toEqual(STUDENT_ACCT);
  });

  it('prefers allowedRoles order when several allowed roles are owned', () => {
    // e.g. /find-tutor allows ['student', 'parent'] — student wins when both exist.
    const target = findAutoSelectAccount(['student', 'parent'], 'teacher', [TEACHER_ACCT, PARENT_ACCT, STUDENT_ACCT]);
    expect(target).toEqual(STUDENT_ACCT);
  });

  it('returns null when the effective role is missing', () => {
    expect(findAutoSelectAccount(['student'], null, [TEACHER_ACCT, STUDENT_ACCT])).toBeNull();
  });
});
