import { describe, expect, it, vi } from 'vitest';

// S4 regression guards (docs/multi-account-regression-plan.md): an authenticated
// user whose active account has the "wrong" role for an onboarding flow is not a
// dead-end — the identity enters its separate account of the intended role,
// creating it first if needed. These tests pin the decision logic the matching
// wizard's Continue handler relies on.

// client.ts (pulled in via api/accounts) reads sessionStorage through adminQaMode
// when called — stub it so the import chain is node-safe.
vi.mock('../adminQa/adminQaMode', () => ({ getAuthorizedQaHeader: () => ({}) }));

import { ensureAccountForRole } from './ensureAccountForRole';

const TEACHER = { id: 'acct-teacher', role: 'teacher' as const, status: 'active' as const };
const STUDENT = { id: 'acct-student', role: 'student' as const, status: 'active' as const };
const PARENT = { id: 'acct-parent', role: 'parent' as const, status: 'active' as const };

function deps(overrides: Partial<Parameters<typeof ensureAccountForRole>[0]> = {}) {
  return {
    targetRole: 'student' as const,
    accounts: [TEACHER],
    activeAccount: TEACHER,
    accessToken: 'tok',
    switchAccount: vi.fn().mockResolvedValue(undefined),
    createAccountApi: vi.fn().mockResolvedValue({ data: STUDENT }),
    ...overrides,
  };
}

describe('ensureAccountForRole', () => {
  it('no-ops when the active account already has the target role', async () => {
    const d = deps({ accounts: [TEACHER, STUDENT], activeAccount: STUDENT });

    const result = await ensureAccountForRole(d);

    expect(result).toEqual({ ok: true, created: false, switched: false });
    expect(d.createAccountApi).not.toHaveBeenCalled();
    expect(d.switchAccount).not.toHaveBeenCalled();
  });

  it('switches to an owned student account without creating one (teacher → student)', async () => {
    const d = deps({ accounts: [TEACHER, STUDENT] });

    const result = await ensureAccountForRole(d);

    expect(result).toEqual({ ok: true, created: false, switched: true });
    expect(d.switchAccount).toHaveBeenCalledWith('acct-student');
    expect(d.createAccountApi).not.toHaveBeenCalled();
  });

  it('creates the student account then switches when none is owned (teacher → student)', async () => {
    const d = deps();

    const result = await ensureAccountForRole(d);

    expect(result).toEqual({ ok: true, created: true, switched: true });
    expect(d.createAccountApi).toHaveBeenCalledWith('student', 'tok');
    expect(d.switchAccount).toHaveBeenCalledWith('acct-student');
  });

  it('creates the parent account then switches (teacher → parent)', async () => {
    const d = deps({
      targetRole: 'parent' as const,
      createAccountApi: vi.fn().mockResolvedValue({ data: PARENT }),
    });

    const result = await ensureAccountForRole(d);

    expect(result).toEqual({ ok: true, created: true, switched: true });
    expect(d.createAccountApi).toHaveBeenCalledWith('parent', 'tok');
    expect(d.switchAccount).toHaveBeenCalledWith('acct-parent');
  });

  // Student↔parent combinations — the conflict resolution is not teacher-specific:
  // an active student adding a parent account (or vice versa) must create/switch
  // the TARGET role only, never duplicate the account it already has.

  it('active student choosing parent (owns student only) creates ONLY a parent account', async () => {
    const d = deps({
      targetRole: 'parent' as const,
      accounts: [STUDENT],
      activeAccount: STUDENT,
      createAccountApi: vi.fn().mockResolvedValue({ data: PARENT }),
    });

    const result = await ensureAccountForRole(d);

    expect(result).toEqual({ ok: true, created: true, switched: true });
    expect(d.createAccountApi).toHaveBeenCalledTimes(1);
    expect(d.createAccountApi).toHaveBeenCalledWith('parent', 'tok');
    expect(d.switchAccount).toHaveBeenCalledWith('acct-parent');
  });

  it('active parent choosing student (owns parent only) creates ONLY a student account', async () => {
    const d = deps({
      targetRole: 'student' as const,
      accounts: [PARENT],
      activeAccount: PARENT,
    });

    const result = await ensureAccountForRole(d);

    expect(result).toEqual({ ok: true, created: true, switched: true });
    expect(d.createAccountApi).toHaveBeenCalledTimes(1);
    expect(d.createAccountApi).toHaveBeenCalledWith('student', 'tok');
    expect(d.switchAccount).toHaveBeenCalledWith('acct-student');
  });

  it('active student choosing parent with BOTH accounts owned switches without creating', async () => {
    const d = deps({
      targetRole: 'parent' as const,
      accounts: [STUDENT, PARENT],
      activeAccount: STUDENT,
    });

    const result = await ensureAccountForRole(d);

    expect(result).toEqual({ ok: true, created: false, switched: true });
    expect(d.createAccountApi).not.toHaveBeenCalled();
    expect(d.switchAccount).toHaveBeenCalledWith('acct-parent');
  });

  it('active parent choosing student with BOTH accounts owned switches without creating', async () => {
    const d = deps({
      targetRole: 'student' as const,
      accounts: [STUDENT, PARENT],
      activeAccount: PARENT,
    });

    const result = await ensureAccountForRole(d);

    expect(result).toEqual({ ok: true, created: false, switched: true });
    expect(d.createAccountApi).not.toHaveBeenCalled();
    expect(d.switchAccount).toHaveBeenCalledWith('acct-student');
  });

  it('does not reuse a non-active owned account — creates a fresh path instead', async () => {
    const blockedStudent = { ...STUDENT, status: 'blocked' as const };
    const d = deps({ accounts: [TEACHER, blockedStudent] });

    const result = await ensureAccountForRole(d);

    expect(result).toEqual({ ok: true, created: true, switched: true });
    expect(d.createAccountApi).toHaveBeenCalled();
  });

  it('fails without switching when createAccount errors (e.g. flag off → 403)', async () => {
    const d = deps({
      createAccountApi: vi.fn().mockResolvedValue({ error: 'Multi-account creation is disabled', status: 403 }),
    });

    const result = await ensureAccountForRole(d);

    expect(result).toEqual({ ok: false, error: 'Multi-account creation is disabled', status: 403 });
    expect(d.switchAccount).not.toHaveBeenCalled();
  });

  it('fails when no access token is available and creation is needed', async () => {
    const d = deps({ accessToken: undefined });

    const result = await ensureAccountForRole(d);

    expect(result).toEqual({ ok: false, error: 'Missing authentication token' });
    expect(d.createAccountApi).not.toHaveBeenCalled();
    expect(d.switchAccount).not.toHaveBeenCalled();
  });

  it('returns ok:false instead of throwing when switchAccount rejects', async () => {
    const d = deps({
      accounts: [TEACHER, STUDENT],
      switchAccount: vi.fn().mockRejectedValue(new Error('boom')),
    });

    const result = await ensureAccountForRole(d);

    expect(result).toEqual({ ok: false, error: 'Unable to switch account' });
  });
});
