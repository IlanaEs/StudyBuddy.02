import { useAuth } from '../auth/AuthProvider';

export function AdminDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="w-full max-w-2xl">
      <p className="mb-3 text-sm uppercase text-studybuddy-lime">ניהול</p>
      <h1 className="font-display text-4xl font-semibold leading-tight">
        שלום, {user?.full_name ?? 'מנהל'}
      </h1>
      <p className="mt-4 text-sm text-white/64">לוח הבקרה של המנהל יהיה זמין בקרוב.</p>
    </div>
  );
}
