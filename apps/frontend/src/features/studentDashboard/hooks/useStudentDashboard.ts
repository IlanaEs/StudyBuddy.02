import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../../auth/AuthProvider';
import { getStudentDashboard } from '../api/getStudentDashboard';
import type { StudentDashboardPayload } from '../api/types';

export function useStudentDashboard() {
  const { session } = useAuth();
  const token = session?.access_token ?? null;

  const [data, setData] = useState<StudentDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setError(null);
    const res = await getStudentDashboard(token);
    if ('error' in res) {
      setError(res.error);
    } else {
      setData(res.data);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, refetch: load };
}
