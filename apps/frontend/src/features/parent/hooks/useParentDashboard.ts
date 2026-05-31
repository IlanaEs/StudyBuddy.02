import { useCallback, useEffect, useRef, useState } from 'react';

import { notifications } from '@mantine/notifications';

import { useAuth } from '../../../auth/AuthProvider';
import { approveLessonConfirmation } from '../api/approveLessonConfirmation';
import { getParentDashboard } from '../api/getParentDashboard';
import { updateHomeworkTask } from '../api/updateHomeworkTask';
import type { HomeworkTaskStatus, ParentDashboardPayload } from '../api/types';

export function useParentDashboard() {
  const { session } = useAuth();
  const token = session?.access_token ?? null;

  const [data, setData] = useState<ParentDashboardPayload | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [childSwitching, setChildSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>(undefined);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    if (!token) {
      setInitialLoading(false);
      return;
    }

    if (!hasLoadedOnce.current) {
      setInitialLoading(true);
    } else {
      setChildSwitching(true);
    }
    setError(null);

    getParentDashboard(token, selectedStudentId).then((res) => {
      if ('error' in res) {
        setError(res.error);
      } else {
        hasLoadedOnce.current = true;
        setData(res.data);
      }
      setInitialLoading(false);
      setChildSwitching(false);
    });
  }, [token, selectedStudentId]);

  const selectStudent = useCallback((id: string) => {
    setSelectedStudentId(id);
  }, []);

  const approveConfirmation = useCallback(
    async (confirmationId: string) => {
      if (!token || !data) return;

      const previous = data;
      setData({ ...data, pending_confirmation: null });

      const res = await approveLessonConfirmation(token, confirmationId);
      if ('error' in res) {
        setData(previous);
        notifications.show({
          title: 'שגיאה',
          message: 'לא הצלחנו לאשר את השיעור. נסה שוב.',
          color: 'red',
        });
      } else {
        notifications.show({
          title: 'השיעור אושר',
          message: 'השיעור סומן כסגור בהצלחה.',
          color: 'green',
        });
      }
    },
    [token, data],
  );

  const updateHomework = useCallback(
    async (taskId: string, status: HomeworkTaskStatus) => {
      if (!token) return;
      const res = await updateHomeworkTask(token, taskId, status);
      if ('error' in res) {
        notifications.show({
          title: 'שגיאה',
          message: 'לא הצלחנו לעדכן את המשימה.',
          color: 'red',
        });
      } else {
        notifications.show({
          title: 'המשימה עודכנה',
          message: 'סטטוס שיעורי הבית עודכן בהצלחה.',
          color: 'green',
        });
      }
    },
    [token],
  );

  return {
    data,
    initialLoading,
    childSwitching,
    error,
    selectedStudentId,
    selectStudent,
    approveConfirmation,
    updateHomework,
  };
}
