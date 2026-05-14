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

export type AuthSessionPayload = {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
};

export type AuthPayload = {
  user: LocalUser;
  session: AuthSessionPayload;
};
