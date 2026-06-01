import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import type { AcademicRepositoryItem, AcademicRepositoryRequest, AcademicRepositoryType } from './academicRepositories.types.js';

const adminClient = createSupabaseAdminClient;
const REQUEST_COLUMNS =
  'id,repository_type,requested_name,requested_by_user_id,status,' +
  'reviewed_by_admin_user_id,reviewed_at,created_at,' +
  'requesting_user:users!academic_repository_requests_requested_by_fk(email,full_name)';

function normalizeRepositoryName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function comparableRepositoryName(name: string): string {
  return normalizeRepositoryName(name).toLocaleLowerCase();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toItem(row: any): AcademicRepositoryItem {
  return {
    id: row.id as string,
    name: row.name as string,
    category: row.category as string | null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRequest(row: any): AcademicRepositoryRequest {
  return {
    id: row.id as string,
    repositoryType: row.repository_type as AcademicRepositoryType,
    requestedName: row.requested_name as string,
    requestedByUserId: row.requested_by_user_id as string,
    requestingUserEmail: row.requesting_user?.email ?? null,
    requestingUserFullName: row.requesting_user?.full_name ?? null,
    status: row.status as 'pending' | 'approved' | 'rejected',
    reviewedByAdminUserId: row.reviewed_by_admin_user_id as string | null,
    reviewedAt: row.reviewed_at as string | null,
    createdAt: row.created_at as string,
  };
}

export async function listAcademicInstitutions(): Promise<AcademicRepositoryItem[]> {
  const { data, error } = await adminClient()
    .from('academic_institutions')
    .select('id,name,category')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw new AppError('Failed to load academic institutions', 500);
  return (data ?? []).map(toItem);
}

export async function listAcademicFields(): Promise<AcademicRepositoryItem[]> {
  const { data, error } = await adminClient()
    .from('academic_fields')
    .select('id,name,category')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw new AppError('Failed to load academic fields', 500);
  return (data ?? []).map(toItem);
}

export async function createAcademicRepositoryRequest(input: {
  repositoryType: AcademicRepositoryType;
  requestedName: string;
  requestedByUserId: string;
}): Promise<AcademicRepositoryRequest> {
  const { data, error } = await adminClient()
    .from('academic_repository_requests')
    .insert({
      repository_type: input.repositoryType,
      requested_name: normalizeRepositoryName(input.requestedName),
      requested_by_user_id: input.requestedByUserId,
      status: 'pending',
    })
    .select(REQUEST_COLUMNS)
    .single();

  if (error) throw new AppError('Failed to create academic repository request', 500);
  return toRequest(data);
}

export async function listAcademicRepositoryRequests(filter: {
  status?: 'pending' | 'approved' | 'rejected';
  repositoryType?: AcademicRepositoryType;
}): Promise<AcademicRepositoryRequest[]> {
  let query = adminClient()
    .from('academic_repository_requests')
    .select(REQUEST_COLUMNS)
    .order('created_at', { ascending: false });

  if (filter.status) query = query.eq('status', filter.status);
  if (filter.repositoryType) query = query.eq('repository_type', filter.repositoryType);

  const { data, error } = await query;
  if (error) throw new AppError('Failed to load academic repository requests', 500);
  return (data ?? []).map(toRequest);
}

export async function getAcademicRepositoryRequestById(id: string): Promise<AcademicRepositoryRequest | null> {
  const { data, error } = await adminClient()
    .from('academic_repository_requests')
    .select(REQUEST_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new AppError('Failed to load academic repository request', 500);
  return data ? toRequest(data) : null;
}

async function findCanonicalByNormalizedName(
  repositoryType: AcademicRepositoryType,
  name: string,
): Promise<AcademicRepositoryItem | null> {
  const table = repositoryType === 'institution' ? 'academic_institutions' : 'academic_fields';
  const { data, error } = await adminClient()
    .from(table)
    .select('id,name,category')
    .eq('is_active', true);

  if (error) throw new AppError('Failed to check academic repository duplicates', 500);
  const comparable = comparableRepositoryName(name);
  const match = (data ?? []).find((row) => comparableRepositoryName(String(row.name)) === comparable);
  return match ? toItem(match) : null;
}

async function createCanonicalRepositoryItem(
  repositoryType: AcademicRepositoryType,
  name: string,
): Promise<AcademicRepositoryItem> {
  const table = repositoryType === 'institution' ? 'academic_institutions' : 'academic_fields';
  const { data, error } = await adminClient()
    .from(table)
    .insert({ name: normalizeRepositoryName(name), is_active: true })
    .select('id,name,category')
    .single();

  if (error) throw new AppError('Failed to create canonical academic repository entry', 500);
  return toItem(data);
}

export async function approveAcademicRepositoryRequest(input: {
  requestId: string;
  adminUserId: string;
}): Promise<{ request: AcademicRepositoryRequest; canonicalItem: AcademicRepositoryItem }> {
  const request = await getAcademicRepositoryRequestById(input.requestId);
  if (!request) throw new AppError('Academic repository request not found', 404);
  if (request.status !== 'pending') throw new AppError('Only pending requests can be approved', 409);

  const existing = await findCanonicalByNormalizedName(request.repositoryType, request.requestedName);
  const canonicalItem = existing ?? await createCanonicalRepositoryItem(request.repositoryType, request.requestedName);

  const { data, error } = await adminClient()
    .from('academic_repository_requests')
    .update({
      status: 'approved',
      reviewed_by_admin_user_id: input.adminUserId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', input.requestId)
    .eq('status', 'pending')
    .select(REQUEST_COLUMNS)
    .single();

  if (error) throw new AppError('Failed to approve academic repository request', 500);
  return { request: toRequest(data), canonicalItem };
}

export async function rejectAcademicRepositoryRequest(input: {
  requestId: string;
  adminUserId: string;
}): Promise<AcademicRepositoryRequest> {
  const request = await getAcademicRepositoryRequestById(input.requestId);
  if (!request) throw new AppError('Academic repository request not found', 404);
  if (request.status !== 'pending') throw new AppError('Only pending requests can be rejected', 409);

  const { data, error } = await adminClient()
    .from('academic_repository_requests')
    .update({
      status: 'rejected',
      reviewed_by_admin_user_id: input.adminUserId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', input.requestId)
    .eq('status', 'pending')
    .select(REQUEST_COLUMNS)
    .single();

  if (error) throw new AppError('Failed to reject academic repository request', 500);
  return toRequest(data);
}

export async function academicInstitutionExists(id: string): Promise<boolean> {
  const { data, error } = await adminClient()
    .from('academic_institutions')
    .select('id')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new AppError('Failed to validate academic institution', 500);
  return !!data;
}

export async function academicFieldExists(id: string): Promise<boolean> {
  const { data, error } = await adminClient()
    .from('academic_fields')
    .select('id')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new AppError('Failed to validate academic field', 500);
  return !!data;
}

export async function pendingRepositoryRequestExists(input: {
  id: string;
  repositoryType: AcademicRepositoryType;
  userId: string;
}): Promise<boolean> {
  const { data, error } = await adminClient()
    .from('academic_repository_requests')
    .select('id')
    .eq('id', input.id)
    .eq('repository_type', input.repositoryType)
    .eq('requested_by_user_id', input.userId)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) throw new AppError('Failed to validate academic repository request', 500);
  return !!data;
}
