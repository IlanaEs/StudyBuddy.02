import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';

describe('auth foundation routes', () => {
  it('rejects /auth/me without a bearer token', async () => {
    const app = createApp();

    const response = await request(app).get('/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Missing authentication token' });
  });

  it('validates signup input before calling Supabase Auth', async () => {
    const app = createApp();

    const response = await request(app).post('/auth/signup').send({
      email: 'not-an-email',
      password: 'short',
      role: 'admin',
      full_name: '',
    });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({ error: 'Request validation failed' });
  });
});
