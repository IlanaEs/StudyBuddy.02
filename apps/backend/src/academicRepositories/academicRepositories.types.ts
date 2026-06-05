// 'subject' requests are capture-only (quick wizard off-taxonomy); the admin
// approve→subjects upsert is deferred to the taxonomy backlog.
export type AcademicRepositoryType = 'institution' | 'field' | 'subject';

export type AcademicRepositoryItem = {
  id: string;
  name: string;
  category: string | null;
};

export type AcademicRepositoryRequest = {
  id: string;
  repositoryType: AcademicRepositoryType;
  requestedName: string;
  requestedByUserId: string;
  requestingUserEmail: string | null;
  requestingUserFullName: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewedByAdminUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
};
