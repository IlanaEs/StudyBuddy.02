import { useEffect, useRef } from 'react';
import { useAuth } from '../../../auth/AuthProvider';
import { fetchOnboardingDraft, type OnboardingStateRemote } from '../../../api/teacherOnboarding';
import { getTeacherLessons } from '../../../api/lessons';
import { getTeacherPendingBookings } from '../../../api/bookingRequests';
import { getMyAvailability } from '../../../api/teacherAvailability';
import { useTeacherDashboardStore } from '../store/teacherDashboardStore';
import { isDashboardSeedEnabled, buildDevSeed } from '../dev/devSeed';
import type {
  TeacherConfig,
  SubscriptionInfo,
  DashboardLesson,
  DashboardRequest,
  RequestStatus,
  AvailabilitySlot,
} from '../types/teacherDashboard.types';

// Maps the persisted onboarding state into the dashboard's seeded config
// (verification, subjects, availability, capacity, pricing).
export function mapOnboardingToConfig(remote: OnboardingStateRemote): TeacherConfig {
  const draft = remote.draft;
  return {
    fullName: remote.fullName,
    isVerified: remote.isVerified,
    subjects: draft?.selectedSubjects ?? [],
    weeklyTimeBlocks: draft?.weeklyTimeBlocks ?? [],
    maxActiveStudents: draft?.maxActiveStudents ?? null,
    weeklyTeachingHours: draft?.weeklyTeachingHours ?? null,
    hourlyRate: typeof remote.hourlyRate === 'number' ? remote.hourlyRate : null,
    introSessionPricing: draft?.introSessionPricing ?? null,
    bookingApproval: draft?.bookingApproval ?? null,
    // Settings (T5) fields — DB-default values until the real profile/scheduling
    // endpoints feed them; `email` is set from the session by the caller.
    bio: null,
    avatarUrl: null,
    email: null,
    defaultLessonDurationMinutes: 50,
    defaultBreakDurationMinutes: 10,
    isFrozen: false,
  };
}

// Subscription/billing is backend-driven; surface a read-only proxy so the
// Settings card renders. No real billing is wired.
function buildSubscriptionProxy(): SubscriptionInfo {
  const next = new Date();
  next.setMonth(next.getMonth() + 1);
  return { plan: 'Pro', priceILS: 99, nextBillingAt: next.toISOString(), status: 'active' };
}

/**
 * Seeds the teacher dashboard once: config from the onboarding draft, plus real
 * lessons + pending requests from the existing endpoints — all written to the
 * single store the tiles read from. Active Students and Wallet figures are
 * derived from this data in the tiles (no parallel state).
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

    const {
      setStatus,
      setConfig,
      setLessons,
      setRequests,
      setAvailability,
      setLedgerEntries,
      setStudents,
      setMaterials,
      setTasks,
      setSubscription,
    } = useTeacherDashboardStore.getState();

    // DEV-only QA seed (opt-in flag). Populates the store and skips the network
    // so the tiles render real-looking content without a backend. No-op in prod.
    if (isDashboardSeedEnabled()) {
      const seed = buildDevSeed();
      setConfig(seed.config);
      setLessons(seed.lessons);
      setRequests(seed.requests);
      setLedgerEntries(seed.ledgerEntries);
      setStudents(seed.students);
      setMaterials(seed.materials);
      setTasks(seed.tasks);
      setSubscription(seed.subscription);
      setStatus('ready');
      return;
    }

    setStatus('loading');

    void (async () => {
      try {
        const [draftRes, lessonsRes, requestsRes, availabilityRes] = await Promise.all([
          fetchOnboardingDraft(token),
          getTeacherLessons(token),
          getTeacherPendingBookings(token),
          getMyAvailability(token),
        ]);

        if ('error' in draftRes) {
          setStatus('error', 'לא ניתן לטעון את נתוני הדשבורד.');
          return;
        }
        if (draftRes.data.onboarding) {
          setConfig({
            ...mapOnboardingToConfig(draftRes.data.onboarding),
            email: session?.user?.email ?? null,
          });
        }
        setSubscription(buildSubscriptionProxy());

        // Entity fetches are best-effort: an empty result still renders empty states.
        if (!('error' in lessonsRes)) {
          const lessons: DashboardLesson[] = lessonsRes.data.lessons.map((l) => ({
            id: l.id,
            studentId: l.studentId,
            studentName: l.studentName,
            subjectName: l.subjectName,
            startsAt: l.scheduledStartAt,
            endsAt: l.scheduledEndAt,
            status: l.status,
            meetingLink: null,
            amount: null,
          }));
          setLessons(lessons);
        }

        if (!('error' in requestsRes)) {
          const requests: DashboardRequest[] = requestsRes.data.booking_requests.map((r) => ({
            id: r.id,
            studentId: '', // not provided by the pending-bookings endpoint
            studentName: r.studentName,
            subjectName: null,
            requestedStartAt: r.requestedStartAt,
            requestedEndAt: r.requestedEndAt,
            status: r.status as RequestStatus,
            studentMessage: r.studentMessage,
            createdAt: r.createdAt,
          }));
          setRequests(requests);
        }

        if (!('error' in availabilityRes)) {
          const slots: AvailabilitySlot[] = availabilityRes.data.availability_slots
            .filter((s) => s.isActive)
            .map((s) => ({
              id: s.id,
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              endTime: s.endTime,
              isActive: s.isActive,
            }));
          setAvailability(slots);
        }

        setStatus('ready');
      } catch {
        setStatus('error', 'שגיאת תקשורת בטעינת הדשבורד.');
      }
    })();
  }, [authStatus, token]);

  return { status: store.status, error: store.error, config: store.config };
}
