import { useEffect, useRef } from 'react';
import { useAuth } from '../../../auth/AuthProvider';
import { fetchOnboardingDraft, type OnboardingStateRemote } from '../../../api/teacherOnboarding';
import { useTeacherDashboardStore } from '../store/teacherDashboardStore';
import type { TeacherConfig } from '../types/teacherDashboard.types';

// Maps the persisted onboarding state into the dashboard's seeded config
// (subjects, availability, capacity, pricing).
export function mapOnboardingToConfig(remote: OnboardingStateRemote): TeacherConfig {
  const draft = remote.draft;
  return {
    fullName: remote.fullName,
    subjects: draft?.selectedSubjects ?? [],
    weeklyTimeBlocks: draft?.weeklyTimeBlocks ?? [],
    maxActiveStudents: draft?.maxActiveStudents ?? null,
    weeklyTeachingHours: draft?.weeklyTeachingHours ?? null,
    hourlyRate: typeof remote.hourlyRate === 'number' ? remote.hourlyRate : null,
    introSessionPricing: draft?.introSessionPricing ?? null,
    bookingApproval: draft?.bookingApproval ?? null,
  };
}

/**
 * Seeds the teacher dashboard store once from the saved onboarding draft.
 * Entity arrays (lessons/requests/students/ledger) stay empty in T0 — real
 * fetching is a later task; this only loads the teacher's config + status.
 */
export function useTeacherDashboardSeed() {
  const { status: authStatus, session } = useAuth();
  const store = useTeacherDashboardStore();
  const startedRef = useRef(false);

  const token = session?.access_token;

  useEffect(() => {
    if (authStatus !== 'authenticated' || !token) return;
    if (startedRef.current) return;
    if (useTeacherDashboardStore.getState().status !== 'idle') return;
    startedRef.current = true;

    const { setStatus, setConfig } = useTeacherDashboardStore.getState();
    setStatus('loading');

    fetchOnboardingDraft(token)
      .then((response) => {
        if ('error' in response) {
          setStatus('error', 'לא ניתן לטעון את נתוני הדשבורד.');
          return;
        }
        const onboarding = response.data.onboarding;
        if (onboarding) {
          setConfig(mapOnboardingToConfig(onboarding));
        }
        // Ready even without a draft — the dashboard renders with empty states.
        setStatus('ready');
      })
      .catch(() => setStatus('error', 'שגיאת תקשורת בטעינת הדשבורד.'));
  }, [authStatus, token]);

  return {
    status: store.status,
    error: store.error,
    config: store.config,
  };
}
