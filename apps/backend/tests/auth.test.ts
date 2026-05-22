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

  it('rejects /auth/complete-oauth-signup without a bearer token', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/auth/complete-oauth-signup')
      .send({ role: 'student', full_name: 'Test User' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Missing authentication token' });
  });

  it('validates complete-oauth-signup: rejects invalid role', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/auth/complete-oauth-signup')
      .set('Authorization', 'Bearer fake-token')
      .send({ role: 'admin', full_name: 'Test User' });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({ error: 'Request validation failed' });
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

  it('rejects POST /api/students without a bearer token', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/students')
      .send({ full_name: 'Test Student' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Missing authentication token' });
  });

  it('rejects POST /api/student-intakes without a bearer token', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/student-intakes')
      .send({ subject_name: 'Math', location_preference: 'online' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Missing authentication token' });
  });
});
