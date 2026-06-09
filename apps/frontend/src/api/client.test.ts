import { afterEach, describe, expect, it, vi } from 'vitest';

// getAuthorizedQaHeader reads sessionStorage — stub it so the client is testable in node.
vi.mock('../adminQa/adminQaMode', () => ({ getAuthorizedQaHeader: () => ({}) }));

import { apiRequest } from './client';

function mockFetchOk() {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: { ok: true } }) });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('apiRequest header merge', () => {
  // Regression: a caller passing its own init.headers must NOT clobber the
  // auto-attached Authorization (this caused a 401 on booking-requests/respond).
  it('keeps Authorization even when the caller passes init.headers', async () => {
    const fetchMock = mockFetchOk();

    await apiRequest(
      '/api/booking-requests/abc/respond',
      { method: 'POST', body: JSON.stringify({ response: 'approve' }), headers: { 'X-Provider-Token': 'ptok' } },
      'access-tok',
    );

    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer access-tok');
    expect(headers['X-Provider-Token']).toBe('ptok');
    expect(headers['Content-Type']).toBe('application/json');
    expect(init.method).toBe('POST');
  });

  it('attaches Authorization when no init.headers are passed', async () => {
    const fetchMock = mockFetchOk();
    await apiRequest('/api/x', { method: 'GET' }, 'tok2');
    const headers = (fetchMock.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok2');
  });
});
