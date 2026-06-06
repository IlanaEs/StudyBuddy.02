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

  // No local user for this token: provision a brand-new authenticated user. If
  // the token lacks the metadata needed to establish a user (e.g. the role isn't
  // assigned yet during OAuth signup), extract* throws a 4xx — surfaced as a
  // normal "not provisioned / forbidden" (403/422), NOT a 401 logout, so the
  // signup flow can proceed to assign the role. A genuinely invalid/expired
  // token is already caught above (getUser → 401).
  const synced = await syncLocalUser({
    authUserId: data.user.id,
    email: extractEmail(data.user),
    role: extractRole(data.user),
    fullName: extractFullName(data.user),
  });

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
): Promise<{ user: LocalUser; isNewUser: boolean }> {
  const { data, error } = await publicClient().auth.getUser(accessToken);

  if (error || !data.user) {
    throw new AppError('Invalid OAuth session', 401);
  }

  const authUser = data.user;

  // Existing StudyBuddy user clicking "Sign Up" again is a NORMAL journey, not an
  // error: return the existing user idempotently with isNewUser=false. The caller
  // redirects to the dashboard for the user's ACTUAL role — no re-provisioning, no
  // "account already exists" error, no onboarding restart, and (critically) no
  // second profile insert. We deliberately do NOT 403 on an account_type that
  // differs from the existing role; we just send them to their real dashboard.
  const priorUser = await findLocalUserByAuthId(authUser.id);
  if (priorUser) {
    return { user: priorUser, isNewUser: false };
  }

  // Brand-new user: assign the role from the chosen account_type (unless the auth
  // user somehow already carries one) and create the local user row.
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
  }

  const user = await syncLocalUser({
    authUserId: authUser.id,
    email: authUser.email ?? '',
    role: (existingRole ?? expectedRole) as LocalUser['role'],
    fullName: input.full_name ?? authUser.user_metadata?.full_name ?? '',
  });

  return { user, isNewUser: true };
}

export async function logout(accessToken: string) {
  const { error } = await adminClient().auth.admin.signOut(accessToken, 'global');

  if (error) {
    throw new AppError('Unable to sign out authenticated session', 401);
  }

  return { signed_out: true };
}
