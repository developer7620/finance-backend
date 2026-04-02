import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../src/config/prisma';
import app from '../src/app';
import { resetDatabase, seedTestData } from './helpers/database';

describe('Auth Integration', () => {
  let seeded: Awaited<ReturnType<typeof seedTestData>>;

  beforeEach(async () => {
    await resetDatabase();
    seeded = await seedTestData();
  });

  it('registers a new viewer and creates a refresh token session', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'New Viewer',
      email: 'new.viewer@finance.dev',
      password: 'Viewer@1234',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.role).toBe('VIEWER');
    expect(response.body.data.tokens.accessToken).toEqual(expect.any(String));
    expect(response.body.data.tokens.refreshToken).toEqual(expect.any(String));

    const registeredUser = await prisma.user.findUnique({
      where: {
        email: 'new.viewer@finance.dev',
      },
      include: {
        refreshTokens: true,
        auditLogs: true,
      },
    });

    expect(registeredUser).not.toBeNull();
    expect(registeredUser?.refreshTokens).toHaveLength(1);
    expect(registeredUser?.auditLogs[0]?.action).toBe('AUTH_REGISTER');
  });

  it('rotates refresh tokens and revokes the family on reuse detection', async () => {
    const loginResponse = await request(app).post('/api/auth/login').send({
      email: seeded.users.admin.email,
      password: seeded.users.admin.password,
    });

    expect(loginResponse.status).toBe(200);

    const firstRefreshToken = loginResponse.body.data.tokens.refreshToken as string;

    const refreshResponse = await request(app).post('/api/auth/refresh').send({
      refreshToken: firstRefreshToken,
    });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.data.tokens.refreshToken).not.toBe(firstRefreshToken);

    const reusedTokenResponse = await request(app).post('/api/auth/refresh').send({
      refreshToken: firstRefreshToken,
    });

    expect(reusedTokenResponse.status).toBe(401);
    expect(reusedTokenResponse.body.error.code).toBe('UNAUTHORIZED');

    const secondRefreshToken = refreshResponse.body.data.tokens.refreshToken as string;
    const familyRevokedResponse = await request(app).post('/api/auth/refresh').send({
      refreshToken: secondRefreshToken,
    });

    expect(familyRevokedResponse.status).toBe(401);

    const refreshAuditActions = await prisma.auditLog.findMany({
      where: {
        actorId: seeded.users.admin.id,
        action: {
          in: ['AUTH_LOGIN', 'AUTH_REFRESH', 'AUTH_REFRESH_REUSE'],
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const refreshActions = refreshAuditActions.map((entry) => entry.action);

    expect(refreshActions[0]).toBe('AUTH_LOGIN');
    expect(refreshActions[1]).toBe('AUTH_REFRESH');
    expect(refreshActions.filter((action) => action === 'AUTH_REFRESH_REUSE').length).toBeGreaterThanOrEqual(1);
  });

  it('supports logout and logout-all session revocation', async () => {
    const firstLogin = await request(app).post('/api/auth/login').send({
      email: seeded.users.analyst.email,
      password: seeded.users.analyst.password,
    });

    const secondLogin = await request(app).post('/api/auth/login').send({
      email: seeded.users.analyst.email,
      password: seeded.users.analyst.password,
    });

    const firstRefreshToken = firstLogin.body.data.tokens.refreshToken as string;
    const secondRefreshToken = secondLogin.body.data.tokens.refreshToken as string;
    const secondAccessToken = secondLogin.body.data.tokens.accessToken as string;

    const logoutResponse = await request(app).post('/api/auth/logout').send({
      refreshToken: firstRefreshToken,
    });

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.data.revoked).toBe(true);

    const revokedRefreshResponse = await request(app).post('/api/auth/refresh').send({
      refreshToken: firstRefreshToken,
    });

    expect(revokedRefreshResponse.status).toBe(401);

    const logoutAllResponse = await request(app)
      .post('/api/auth/logout-all')
      .set('Authorization', `Bearer ${secondAccessToken}`);

    expect(logoutAllResponse.status).toBe(200);
    expect(logoutAllResponse.body.data.revokedSessions).toBeGreaterThanOrEqual(1);

    const postLogoutAllRefreshResponse = await request(app).post('/api/auth/refresh').send({
      refreshToken: secondRefreshToken,
    });

    expect(postLogoutAllRefreshResponse.status).toBe(401);
  });
});
