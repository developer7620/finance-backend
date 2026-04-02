import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import app from '../src/app';
import { resetDatabase, seedTestData } from './helpers/database';
import { loginUser } from './helpers/auth';

describe('Users Integration', () => {
  let seeded: Awaited<ReturnType<typeof seedTestData>>;

  beforeEach(async () => {
    await resetDatabase();
    seeded = await seedTestData();
  });

  it('blocks viewers from accessing admin-only user routes', async () => {
    const viewerTokens = await loginUser(seeded.users.viewer.email, seeded.users.viewer.password);

    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${viewerTokens.accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('lets admins list, update, and deactivate users', async () => {
    const adminTokens = await loginUser(seeded.users.admin.email, seeded.users.admin.password);
    const viewerTokens = await loginUser(seeded.users.viewer.email, seeded.users.viewer.password);

    const listResponse = await request(app)
      .get('/api/users?page=1&limit=10')
      .set('Authorization', `Bearer ${adminTokens.accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.meta.total).toBe(3);

    const updateResponse = await request(app)
      .patch(`/api/users/${seeded.users.viewer.id}`)
      .set('Authorization', `Bearer ${adminTokens.accessToken}`)
      .send({
        name: 'Viewer Updated',
        role: 'VIEWER',
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.name).toBe('Viewer Updated');

    const deactivateResponse = await request(app)
      .patch(`/api/users/${seeded.users.viewer.id}/deactivate`)
      .set('Authorization', `Bearer ${adminTokens.accessToken}`);

    expect(deactivateResponse.status).toBe(200);
    expect(deactivateResponse.body.data.isActive).toBe(false);

    const meResponse = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${viewerTokens.accessToken}`);

    expect(meResponse.status).toBe(401);

    const refreshResponse = await request(app).post('/api/auth/refresh').send({
      refreshToken: viewerTokens.refreshToken,
    });

    expect(refreshResponse.status).toBe(401);
  });
});
