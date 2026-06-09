import { beforeEach, describe, expect, it, vi } from 'vitest';

// Approve/reject of user-submitted academic content now audits to admin_actions
// (consistency with teacher approvals) and the optional reject reason flows into
// admin_actions.notes (no schema change).

vi.mock('../src/academicRepositories/academicRepositories.repository.js', () => ({
  approveAcademicRepositoryRequest: vi.fn(),
  rejectAcademicRepositoryRequest: vi.fn(),
}));

vi.mock('../src/admin/admin.repository.js', () => ({
  insertAdminAction: vi.fn(),
}));

import {
  approveAdminAcademicRepositoryRequest,
  rejectAdminAcademicRepositoryRequest,
} from '../src/academicRepositories/academicRepositories.service.js';
import {
  approveAcademicRepositoryRequest,
  rejectAcademicRepositoryRequest,
} from '../src/academicRepositories/academicRepositories.repository.js';
import { insertAdminAction } from '../src/admin/admin.repository.js';
import type { LocalUser } from '../src/auth/authTypes.js';

const admin: LocalUser = {
  id: 'admin-1',
  supabase_auth_user_id: 'auth-admin',
  email: 'admin@example.com',
  role: 'admin',
  full_name: 'Admin',
  status: 'active',
};

const REQ_ID = '22222222-2222-2222-2222-222222222222';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(approveAcademicRepositoryRequest).mockResolvedValue({ id: REQ_ID } as never);
  vi.mocked(rejectAcademicRepositoryRequest).mockResolvedValue({ id: REQ_ID } as never);
  vi.mocked(insertAdminAction).mockResolvedValue({} as never);
});

describe('content approvals — audit', () => {
  it('approve audits content.approve', async () => {
    await approveAdminAcademicRepositoryRequest(REQ_ID, admin);

    expect(approveAcademicRepositoryRequest).toHaveBeenCalledWith({ requestId: REQ_ID, adminUserId: 'admin-1' });
    expect(insertAdminAction).toHaveBeenCalledWith('admin-1', {
      action_type: 'content.approve',
      target_entity_type: 'academic_repository_request',
      target_entity_id: REQ_ID,
      notes: null,
    });
  });

  it('reject audits content.reject with the optional reason', async () => {
    await rejectAdminAcademicRepositoryRequest(REQ_ID, admin, 'כפילות בקטלוג');

    expect(insertAdminAction).toHaveBeenCalledWith('admin-1', {
      action_type: 'content.reject',
      target_entity_type: 'academic_repository_request',
      target_entity_id: REQ_ID,
      notes: 'כפילות בקטלוג',
    });
  });

  it('reject works with no reason (notes null)', async () => {
    await rejectAdminAcademicRepositoryRequest(REQ_ID, admin);

    expect(insertAdminAction).toHaveBeenCalledWith(
      'admin-1',
      expect.objectContaining({ action_type: 'content.reject', notes: null }),
    );
  });
});
