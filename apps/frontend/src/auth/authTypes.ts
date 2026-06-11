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

// A single app account belonging to the logged-in identity. One Google login may
// own several (teacher/student/parent); the active one is sent as X-Account-Id.
export type Account = {
  id: string;
  role: UserRole;
  onboarding_completed: boolean;
  status: 'active' | 'inactive' | 'blocked';
  is_default: boolean;
};
