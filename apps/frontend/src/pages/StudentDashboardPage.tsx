import { useAuth } from '../auth/AuthProvider';

export function StudentDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="w-full max-w-2xl">
      <p className="mb-3 text-sm uppercase text-studybuddy-lime">לוח בקרה (Dashboard)</p>
      <h1 className="font-display text-4xl font-semibold leading-tight">
        שלום, {user?.full_name ?? 'תלמיד'}
      </h1>
      <p className="mt-4 text-sm text-white/64">אזור התלמיד יהיה זמין בקרוב.</p>
    </div>
  );
}
