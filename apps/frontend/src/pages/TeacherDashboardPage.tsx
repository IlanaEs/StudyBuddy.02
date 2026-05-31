import { Link } from 'react-router-dom';
import { Inbox, BookOpen } from 'lucide-react';

import { useAuth } from '../auth/AuthProvider';

export function TeacherDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="w-full max-w-2xl">
      <p className="mb-3 text-sm uppercase text-studybuddy-lime">לוח בקרה</p>
      <h1 className="font-display text-4xl font-semibold leading-tight">
        שלום, {user?.full_name ?? 'מורה'}
      </h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          to="/teacher/inbox"
          className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/10 p-5 shadow-soft transition hover:border-studybuddy-turquoise/40 hover:bg-white/15"
        >
          <Inbox className="h-6 w-6 shrink-0 text-studybuddy-turquoise" />
          <div>
            <p className="font-semibold">תיבת דואר</p>
            <p className="mt-0.5 text-sm text-white/64">בקשות שיעור ממתינות</p>
          </div>
        </Link>
        <Link
          to="/teacher/lessons"
          className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/10 p-5 shadow-soft transition hover:border-studybuddy-turquoise/40 hover:bg-white/15"
        >
          <BookOpen className="h-6 w-6 shrink-0 text-studybuddy-turquoise" />
          <div>
            <p className="font-semibold">שיעורים</p>
            <p className="mt-0.5 text-sm text-white/64">ניהול שיעורים קבועים</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
