import type { User } from '@supabase/supabase-js';

import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient, createSupabasePublicClient } from '../supabase/supabaseClients.js';
import type { CompleteOAuthSignupInput } from './authValidation.js';
import { findLocalUserByAuthId, syncLocalUser } from './authRepository.js';
import type { LocalUser, UserRole } from './authTypes.js';
import { userRoles } from './authTypes.js';

const publicClient = createSupabasePublicClient;
const adminClient = createSupabaseAdminClient;

function roleForAccountType(accountType: CompleteOAuthSignupInput['account_type']): Extract<UserRole, 'student' | 'parent' | 'teacher'> {
  if (accountType === 'teacher') return 'teacher';
  return accountType === 'parent_for_child' ? 'parent' : 'student';
}

function extractRole(user: User, fallbackRole?: UserRole): UserRole {
  const metadataRole = user.app_metadata?.role;
  const role = fallbackRole ?? metadataRole;

  if (userRoles.includes(role as UserRole)) {
    return role as UserRole;
  }

  throw new AppError('Authenticated user role is missing or invalid', 403);
}

function extractFullName(user: User, fallbackFullName?: string) {
  const fullName = fallbackFullName ?? user.user_metadata?.full_name;

  if (typeof fullName !== 'string' || fullName.trim().length === 0) {
    throw new AppError('Authenticated user name is missing', 422);
  }

  return fullName.trim();
}

function extractEmail(user: User) {
  if (!user.email) {
    throw new AppError('Authenticated user email is missing', 422);
  }

  return user.email;
}

export async function verifyAccessToken(accessToken: string) {
  const { data, error } = await publicClient().auth.getUser(accessToken);

  if (error || !data.user) {
    throw new AppError('Invalid or expired authentication token', 401);
  }

  const existingUser = await findLocalUserByAuthId(data.user.id);

  if (existingUser) {
    // Existing-but-suspended stays 403 (deserves a real "account suspended" flow
    // later — not a silent re-login).
    if (existingUser.status !== 'active') {
      throw new AppError('User is not active', 403);
    }
    return { access_token: accessToken, auth_user_id: data.user.id, user: existingUser };
  }

  // No local user for this token: either a brand-new OAuth user to provision, or
  // a token whose user has been deleted/torn down. Attempt to provision; if the
  // token can't establish a valid user (e.g. missing role/name/email metadata),
  // treat it as an invalid session (401) so the client clears it and the user
  // can re-authenticate. Genuine server errors (>=500) still propagate.
  let synced: LocalUser;
  try {
    synced = await syncLocalUser({
      authUserId: data.user.id,
      email: extractEmail(data.user),
      role: extractRole(data.user),
      fullName: extractFullName(data.user),
    });
  } catch (provisionError) {
    if (provisionError instanceof AppError && provisionError.statusCode >= 500) {
      throw provisionError;
    }
    throw new AppError('Authenticated user no longer exists', 401);
  }

  if (synced.status !== 'active') {
    throw new AppError('User is not active', 403);
  }

  return {
    access_token: accessToken,
    auth_user_id: data.user.id,
    user: synced,
  };
}

export async function completeOAuthSignup(
  accessToken: string,
  input: CompleteOAuthSignupInput,
): Promise<{ user: LocalUser }> {
  const { data, error } = await publicClient().auth.getUser(accessToken);

  if (error || !data.user) {
    throw new AppError('Invalid OAuth session', 401);
  }

  const authUser = data.user;
  const existingRole = authUser.app_metadata?.role;
  const expectedRole = roleForAccountType(input.account_type);

  if (!existingRole) {
    const { error: metadataError } = await adminClient().auth.admin.updateUserById(authUser.id, {
      app_metadata: { role: expectedRole },
      user_metadata: { full_name: input.full_name },
    });

    if (metadataError) {
      throw new AppError('Unable to assign user role', 500);
    }
  } else if (existingRole !== expectedRole) {
    throw new AppError('החשבון המחובר לא מתאים למסלול שנבחר.', 403);
  }

  const user = await syncLocalUser({
    authUserId: authUser.id,
    email: authUser.email ?? '',
    role: (existingRole ?? expectedRole) as LocalUser['role'],
    fullName: input.full_name ?? authUser.user_metadata?.full_name ?? '',
  });

  return { user };
}

export async function logout(accessToken: string) {
  const { error } = await adminClient().auth.admin.signOut(accessToken, 'global');

  if (error) {
    throw new AppError('Unable to sign out authenticated session', 401);
  }

  return { signed_out: true };
}
