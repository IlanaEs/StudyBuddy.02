import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Multi-account regression contract: every authenticated API call must carry the
// X-Account-Id header when an active account is selected — otherwise the backend
// resolves the identity's DEFAULT account (usually teacher) and role-guarded
// endpoints 403 (e.g. /api/student-availability/from-calendar requires
// student/parent). apiRequest (client.ts) injects the header automatically; the
// calendar API modules use raw fetch and must spread getActiveAccountHeader()
// into every request — these tests guard that (scenario S1 in
// docs/multi-account-regression-plan.md).

vi.mock('../adminQa/adminQaMode', () => ({ getAuthorizedQaHeader: () => ({}) }));
vi.mock('../auth/ensureActiveSession', () => ({ ensureActiveSupabaseSession: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../auth/supabaseClient', () => ({ getSupabaseBrowserClient: vi.fn() }));

import { clearActiveAccount, setActiveAccountId } from '../auth/activeAccount';
import { apiRequest } from './client';

const ACTIVE_ACCOUNT_ID = 'acct-student-1';

function mockFetch(body: unknown = { data: {} }) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function requestHeaders(fetchMock: ReturnType<typeof vi.fn>): Record<string, string> {
  return (fetchMock.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
}

beforeEach(() => {
  setActiveAccountId(ACTIVE_ACCOUNT_ID);
});

afterEach(() => {
  clearActiveAccount();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('apiRequest (client.ts) — existing behavior guard', () => {
  it('includes X-Account-Id when an active account is set', async () => {
    const fetchMock = mockFetch();

    await apiRequest('/api/auth/me', undefined, 'access-tok');

    expect(requestHeaders(fetchMock)['X-Account-Id']).toBe(ACTIVE_ACCOUNT_ID);
  });

  it('omits X-Account-Id when no active account is set', async () => {
    clearActiveAccount();
    const fetchMock = mockFetch();

    await apiRequest('/api/auth/me', undefined, 'access-tok');

    expect(requestHeaders(fetchMock)['X-Account-Id']).toBeUndefined();
  });
});

describe('studentCalendar — X-Account-Id on calendar calls', () => {
  it('syncStudentCalendarAvailability sends X-Account-Id when an active account exists', async () => {
    const fetchMock = mockFetch({
      data: { preferredDays: [], preferredTimeRanges: [], weeksAnalyzed: 0, busyPeriods: [] },
    });
    const { syncStudentCalendarAvailability } = await import('./studentCalendar');

    await syncStudentCalendarAvailability('access-tok', 'provider-tok');

    const headers = requestHeaders(fetchMock);
    expect(headers.Authorization).toBe('Bearer access-tok');
    expect(headers['X-Provider-Token']).toBe('provider-tok');
    expect(headers['X-Account-Id']).toBe(ACTIVE_ACCOUNT_ID);
  });

  it('addLessonToGoogleCalendar sends X-Account-Id when an active account exists', async () => {
    const fetchMock = mockFetch({ data: { added: true } });
    const { addLessonToGoogleCalendar } = await import('./studentCalendar');

    await addLessonToGoogleCalendar('lesson-1', 'access-tok', 'provider-tok');

    const headers = requestHeaders(fetchMock);
    expect(headers['X-Account-Id']).toBe(ACTIVE_ACCOUNT_ID);
  });
});

describe('teacherCalendar — X-Account-Id on calendar calls', () => {
  // teacherCalendar.ts reads VITE_API_BASE_URL and window.location.origin at
  // module load, so both are stubbed before the dynamic import.
  async function importTeacherCalendar() {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test');
    vi.stubGlobal('window', { location: { origin: 'http://localhost:3001' } });
    return import('./teacherCalendar');
  }

  it('syncCalendar sends X-Account-Id when an active account exists', async () => {
    const mod = await importTeacherCalendar();
    const fetchMock = mockFetch({ data: { busySlots: [] } });

    await mod.syncCalendar('access-tok', 'provider-tok');

    const headers = requestHeaders(fetchMock);
    expect(headers.Authorization).toBe('Bearer access-tok');
    expect(headers['X-Account-Id']).toBe(ACTIVE_ACCOUNT_ID);
  });

  it('fetchCalendarStatus sends X-Account-Id when an active account exists', async () => {
    const mod = await importTeacherCalendar();
    const fetchMock = mockFetch({ data: { status: 'connected', lastSyncedAt: null } });

    await mod.fetchCalendarStatus('access-tok');

    expect(requestHeaders(fetchMock)['X-Account-Id']).toBe(ACTIVE_ACCOUNT_ID);
  });

  it('disconnectCalendar sends X-Account-Id when an active account exists', async () => {
    const mod = await importTeacherCalendar();
    const fetchMock = mockFetch({ data: { disconnected: true } });

    await mod.disconnectCalendar('access-tok');

    expect(requestHeaders(fetchMock)['X-Account-Id']).toBe(ACTIVE_ACCOUNT_ID);
  });

  it('fetchBusySlots sends X-Account-Id when an active account exists', async () => {
    const mod = await importTeacherCalendar();
    const fetchMock = mockFetch({ data: { busySlots: [] } });

    await mod.fetchBusySlots('access-tok');

    expect(requestHeaders(fetchMock)['X-Account-Id']).toBe(ACTIVE_ACCOUNT_ID);
  });
});
