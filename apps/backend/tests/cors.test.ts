import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';

// Regression guard: the browser preflight (OPTIONS) for any request carrying the
// active-account header must succeed, otherwise every X-Account-Id request is
// blocked client-side ("not allowed by Access-Control-Allow-Headers").
describe('CORS preflight', () => {
  it('allows X-Account-Id (and the other custom headers) in the preflight response', async () => {
    const app = createApp();

    const res = await request(app)
      .options('/api/auth/me')
      .set('Origin', 'http://localhost:3001')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization, x-account-id');

    // cors() answers a valid preflight with a 2xx (204 by default).
    expect(res.status).toBeLessThan(400);

    const allowHeaders = String(res.headers['access-control-allow-headers'] ?? '').toLowerCase();
    expect(allowHeaders).toContain('x-account-id');
    expect(allowHeaders).toContain('authorization');
    expect(allowHeaders).toContain('x-provider-token');
    expect(allowHeaders).toContain('x-admin-qa-role');
  });
});
