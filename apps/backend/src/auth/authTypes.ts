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

export type AuthenticatedRequestContext = {
  access_token: string;
  auth_user_id: string;
  user: LocalUser;
};
