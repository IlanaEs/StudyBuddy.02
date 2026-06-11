export const userRoles = ['teacher', 'student', 'parent', 'admin'] as const;

export type UserRole = (typeof userRoles)[number];

export type LocalUser = {
  id: string;
  supabase_auth_user_id: string;
  email: string;
  role: UserRole;
  full_name: string;
  status: 'active' | 'inactive' | 'blocked';
};

export type MeProfile = {
  id: string | null;
  status: 'onboarding' | 'active';
  onboardingCompleted: boolean;
} | null;

// A single app account belonging to an identity (users row). One identity may
// own several accounts (teacher/student/parent), each with its own role,
// onboarding state, and lifecycle. Selected per-request via the X-Account-Id header.
export type Account = {
  id: string;
  role: UserRole;
  onboarding_completed: boolean;
  status: 'active' | 'inactive' | 'blocked';
  is_default: boolean;
};

export type AuthenticatedRequestContext = {
  access_token: string;
  auth_user_id: string;
  // `user` carries the identity fields; `role` reflects the ACTIVE account (so
  // downstream guards/services branch on the selected account, not the stored
  // default). Production always sets `account`; it is optional only so test
  // fixtures that build a context directly may omit it (callers fall back to
  // user.role). See verifyAccessToken / resolveEffectiveRole.
  user: LocalUser;
  account?: Account;
};
