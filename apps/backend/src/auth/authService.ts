import type { User } from '@supabase/supabase-js';

import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient, createSupabasePublicClient } from '../supabase/supabaseClients.js';
import type { LoginInput, SignupInput } from './authValidation.js';
import { findLocalUserByAuthId, syncLocalUser } from './authRepository.js';
import type { LocalUser, UserRole } from './authTypes.js';
import { userRoles } from './authTypes.js';

type AuthSessionPayload = {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
};

type AuthResponse = {
  user: LocalUser;
  session: AuthSessionPayload;
};

const publicClient = createSupabasePublicClient;
const adminClient = createSupabaseAdminClient;

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

function mapSession(session: { access_token: string; refresh_token: string; expires_at?: number } | null): AuthSessionPayload {
  return {
    access_token: session?.access_token ?? null,
    refresh_token: session?.refresh_token ?? null,
    expires_at: session?.expires_at ?? null,
  };
}

export async function signup(input: SignupInput): Promise<AuthResponse> {
  const { data, error } = await publicClient().auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.full_name,
      },
    },
  });

  if (error || !data.user?.email) {
    throw new AppError('Unable to create Supabase Auth user', 422);
  }

  const { error: metadataError } = await adminClient().auth.admin.updateUserById(data.user.id, {
    app_metadata: {
      role: input.role,
    },
    user_metadata: {
      full_name: input.full_name,
    },
  });

  if (metadataError) {
    throw new AppError('Unable to assign authenticated user role', 500);
  }

  const user = await syncLocalUser({
    authUserId: data.user.id,
    email: data.user.email,
    role: input.role,
    fullName: input.full_name,
  });

  return {
    user,
    session: mapSession(data.session),
  };
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const { data, error } = await publicClient().auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error || !data.user?.email || !data.session) {
    throw new AppError('Invalid email or password', 401);
  }

  const existingUser = await findLocalUserByAuthId(data.user.id);
  const user =
    existingUser ??
    (await syncLocalUser({
      authUserId: data.user.id,
      email: data.user.email,
      role: extractRole(data.user),
      fullName: extractFullName(data.user),
    }));

  if (user.status !== 'active') {
    throw new AppError('User is not active', 403);
  }

  return {
    user,
    session: mapSession(data.session),
  };
}

export async function verifyAccessToken(accessToken: string) {
  const { data, error } = await publicClient().auth.getUser(accessToken);

  if (error || !data.user) {
    throw new AppError('Invalid or expired authentication token', 401);
  }

  const existingUser = await findLocalUserByAuthId(data.user.id);
  const localUser =
    existingUser ??
    (await syncLocalUser({
      authUserId: data.user.id,
      email: extractEmail(data.user),
      role: extractRole(data.user),
      fullName: extractFullName(data.user),
    }));

  if (!localUser) {
    throw new AppError('Authenticated user is not synchronized', 403);
  }

  if (localUser.status !== 'active') {
    throw new AppError('User is not active', 403);
  }

  return {
    access_token: accessToken,
    auth_user_id: data.user.id,
    user: localUser,
  };
}

export async function logout(accessToken: string) {
  const { error } = await adminClient().auth.admin.signOut(accessToken, 'global');

  if (error) {
    throw new AppError('Unable to sign out authenticated session', 401);
  }

  return { signed_out: true };
}
