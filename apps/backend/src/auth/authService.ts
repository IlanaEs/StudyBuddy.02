import type { User } from '@supabase/supabase-js';

import { AppError } from '../errors/AppError.js';
import { devAuthBypassEnabled } from '../config/env.js';
import { createSupabaseAdminClient, createSupabasePublicClient } from '../supabase/supabaseClients.js';
import type { CompleteOAuthSignupInput, LoginInput, SignupInput } from './authValidation.js';
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
  requiresEmailConfirmation?: true;
};

const publicClient = createSupabasePublicClient;
const adminClient = createSupabaseAdminClient;

function roleForAccountType(accountType: CompleteOAuthSignupInput['account_type']): Extract<UserRole, 'student' | 'parent'> {
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

function mapSession(session: { access_token: string; refresh_token: string; expires_at?: number } | null): AuthSessionPayload {
  return {
    access_token: session?.access_token ?? null,
    refresh_token: session?.refresh_token ?? null,
    expires_at: session?.expires_at ?? null,
  };
}

// ── Local QA bypass ─────────────────────────────────────────────────────────
// Dev-only signup that auto-confirms the user (no email delivery) and mints a
// real session via password sign-in. Gated by devAuthBypassEnabled, which is
// false in production. Lets onboarding/signup be tested without Supabase email.
async function devBypassSignup(input: SignupInput): Promise<AuthResponse> {
  const { data: created, error: createError } = await adminClient().auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    app_metadata: { role: input.role },
    user_metadata: { full_name: input.full_name },
  });

  if (createError || !created?.user?.email) {
    const code = (createError as { code?: string } | null)?.code;
    const message = createError?.message ?? '';
    if (code === 'email_exists' || /already|exists|registered/i.test(message)) {
      throw new AppError('כבר קיים חשבון עם כתובת האימייל הזו.', 409);
    }
    throw new AppError('Unable to create account. Please check your details and try again.', 422);
  }

  const { data: signIn, error: signInError } = await publicClient().auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (signInError || !signIn.session) {
    throw new AppError('Unable to establish a local session for the new account.', 500);
  }

  const user = await syncLocalUser({
    authUserId: created.user.id,
    email: created.user.email,
    role: input.role,
    fullName: input.full_name,
  });

  return { user, session: mapSession(signIn.session) };
}

export async function signup(input: SignupInput): Promise<AuthResponse> {
  // Local QA only — never reached in production (devAuthBypassEnabled is false there).
  if (devAuthBypassEnabled) {
    return devBypassSignup(input);
  }

  const { data, error } = await publicClient().auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.full_name,
      },
    },
  });

  if (error) {
    // Surface rate-limit as a user-visible message, not an opaque 422.
    if ((error as { code?: string }).code === 'over_email_send_rate_limit') {
      throw new AppError('Too many sign-up attempts. Please wait a few minutes and try again.', 429);
    }
    throw new AppError('Unable to create account. Please check your details and try again.', 422);
  }

  if (!data.user?.email) {
    throw new AppError('Unable to create account. Please check your details and try again.', 422);
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

  // Supabase returns a null session when email confirmation is required.
  // Signal this to the frontend so it can show the correct message.
  if (!data.session) {
    return { user, session: mapSession(null), requiresEmailConfirmation: true };
  }

  return { user, session: mapSession(data.session) };
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
