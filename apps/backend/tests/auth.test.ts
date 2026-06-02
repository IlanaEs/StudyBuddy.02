import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';

describe('auth foundation routes', () => {
  it('rejects /api/auth/me without a bearer token', async () => {
    const app = createApp();

    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Missing authentication token' });
  });

  it('rejects /api/auth/complete-oauth-signup without a bearer token', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/auth/complete-oauth-signup')
      .send({ account_type: 'independent_student', full_name: 'Test User' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Missing authentication token' });
  });

  it('validates complete-oauth-signup: rejects invalid role', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/auth/complete-oauth-signup')
      .set('Authorization', 'Bearer fake-token')
      .send({ role: 'admin', full_name: 'Test User' });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({ error: 'Request validation failed' });
  });

  it('returns 404 for removed POST /api/auth/signup endpoint', async () => {
    const app = createApp();

    const response = await request(app).post('/api/auth/signup').send({
      email: 'test@example.com',
      password: '12345678',
      role: 'student',
      full_name: 'Test',
    });

    expect(response.status).toBe(404);
  });

  it('returns 404 for removed POST /api/auth/login endpoint', async () => {
    const app = createApp();

    const response = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: '12345678',
    });

    expect(response.status).toBe(404);
  });

  it('rejects POST /api/students without a bearer token', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/students')
      .send({ account_type: 'independent_student', full_name: 'Test Student' });

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
