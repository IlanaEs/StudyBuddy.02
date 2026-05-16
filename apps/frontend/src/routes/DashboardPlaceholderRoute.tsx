import { useAuth } from '../auth/AuthProvider';

export function DashboardPlaceholderRoute() {
  const auth = useAuth();

  return (
    <div className="w-full max-w-2xl">
      <p className="mb-4 text-sm uppercase text-studybuddy-lime">Protected foundation</p>
      <h1 className="font-display text-4xl font-semibold leading-tight md:text-5xl">
        Authenticated workspace shell
      </h1>
      <div className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-5 shadow-soft">
        <p className="text-sm text-white/64">Verified local user</p>
        <p className="mt-2 text-lg font-semibold">{auth.user?.full_name}</p>
        <p className="mt-1 text-sm text-white/64">{auth.user?.email}</p>
        <p className="mt-4 inline-flex rounded-full border border-studybuddy-turquoise/30 px-3 py-1 text-xs text-studybuddy-turquoise">
          {auth.user?.role}
        </p>
      </div>
    </div>
  );
}
