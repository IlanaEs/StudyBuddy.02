import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import type { LocalUser, UserRole } from './authTypes.js';

type SyncLocalUserInput = {
  authUserId: string;
  email: string;
  role: UserRole;
  fullName: string;
};

const adminClient = createSupabaseAdminClient;

export async function findLocalUserByAuthId(authUserId: string): Promise<LocalUser | null> {
  const { data, error } = await adminClient()
    .from('users')
    .select('id,supabase_auth_user_id,email,role,full_name,status')
    .eq('supabase_auth_user_id', authUserId)
    .maybeSingle();

  if (error) {
    throw new AppError('Unable to resolve authenticated user', 500);
  }

  return data as LocalUser | null;
}

export async function syncLocalUser(input: SyncLocalUserInput): Promise<LocalUser> {
  const existingUser = await findLocalUserByAuthId(input.authUserId);

  if (existingUser) {
    return existingUser;
  }

  const { data, error } = await adminClient()
    .from('users')
    .insert({
      id: input.authUserId,
      supabase_auth_user_id: input.authUserId,
      email: input.email,
      role: input.role,
      full_name: input.fullName,
      status: 'active',
    })
    .select('id,supabase_auth_user_id,email,role,full_name,status')
    .single();

  if (error || !data) {
    throw new AppError('Unable to synchronize authenticated user', 500);
  }

  return data as LocalUser;
}
