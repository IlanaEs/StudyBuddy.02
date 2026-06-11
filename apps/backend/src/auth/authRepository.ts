import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import type { Account, LocalUser, MeProfile, UserRole } from './authTypes.js';

const ACCOUNT_COLUMNS = 'id,role,onboarding_completed,status,is_default';

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

// Idempotent: creates the onboarding_drafts row for a teacher if it doesn't exist.
export async function ensureOnboardingDraftForTeacher(userId: string): Promise<void> {
  const { error } = await adminClient()
    .from('onboarding_drafts')
    .upsert(
      { user_id: userId, onboarding_step: 1, onboarding_completed: false },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );

  if (error) {
    throw new AppError('Unable to initialize onboarding draft', 500);
  }
}

export async function syncLocalUser(input: SyncLocalUserInput): Promise<LocalUser> {
  const existingUser = await findLocalUserByAuthId(input.authUserId);

  if (existingUser) {
    if (existingUser.role === 'teacher') {
      await ensureOnboardingDraftForTeacher(existingUser.id);
    }
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

  const user = data as LocalUser;

  if (user.role === 'teacher') {
    await ensureOnboardingDraftForTeacher(user.id);
  }

  return user;
}

// Idempotent helper: finds or creates the public.users row + role-scoped records.
// Safe to call multiple times. Never duplicates rows.
export async function ensureAppUserForAuthUser(
  authUser: { id: string; email: string },
  roleHint?: UserRole,
  fullNameHint?: string,
): Promise<LocalUser> {
  const existing = await findLocalUserByAuthId(authUser.id);

  if (existing) {
    if (existing.role === 'teacher') {
      await ensureOnboardingDraftForTeacher(existing.id);
    }
    return existing;
  }

  if (!roleHint || !fullNameHint) {
    throw new AppError('Role and full name required for new user', 422);
  }

  return syncLocalUser({
    authUserId: authUser.id,
    email: authUser.email,
    role: roleHint,
    fullName: fullNameHint,
  });
}

// All accounts owned by an identity, default account first, then oldest-first.
export async function getAccountsByUserId(userId: string): Promise<Account[]> {
  const { data, error } = await adminClient()
    .from('accounts')
    .select(ACCOUNT_COLUMNS)
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    throw new AppError('Unable to load user accounts', 500);
  }

  return (data ?? []) as Account[];
}

// Idempotent: ensures the identity's PRIMARY (default) account for the given role
// exists, and returns it. Only used to self-heal an identity that has no accounts
// yet (created before the accounts backfill, or a brand-new signup) — so setting
// is_default=true cannot collide with an existing default. Phase 3's "create
// another account" uses a separate non-default path.
export async function ensureDefaultAccount(userId: string, role: UserRole): Promise<Account> {
  const { error: upsertError } = await adminClient()
    .from('accounts')
    .upsert(
      { user_id: userId, role, is_default: true, status: 'active' },
      { onConflict: 'user_id,role', ignoreDuplicates: true },
    );

  if (upsertError) {
    throw new AppError('Unable to initialize account', 500);
  }

  const { data, error } = await adminClient()
    .from('accounts')
    .select(ACCOUNT_COLUMNS)
    .eq('user_id', userId)
    .eq('role', role)
    .maybeSingle();

  if (error || !data) {
    throw new AppError('Unable to load initialized account', 500);
  }

  return data as Account;
}

// Returns a lightweight profile summary used by GET /api/auth/me.
// For teachers: derives status from onboarding_drafts.
// For other roles: returns null (no profile record expected at auth time).
export async function getProfileForUser(userId: string, role: UserRole): Promise<MeProfile> {
  if (role !== 'teacher') {
    return null;
  }

  const { data, error } = await adminClient()
    .from('onboarding_drafts')
    .select('id,onboarding_completed')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new AppError('Unable to load user profile', 500);
  }

  if (!data) {
    return { id: null, status: 'onboarding', onboardingCompleted: false };
  }

  const completed = (data as { id: string; onboarding_completed: boolean }).onboarding_completed;
  return {
    id: (data as { id: string; onboarding_completed: boolean }).id,
    status: completed ? 'active' : 'onboarding',
    onboardingCompleted: completed,
  };
}
