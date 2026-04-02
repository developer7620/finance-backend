import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../src/config/prisma';
import app from '../src/app';
import { resetDatabase, seedTestData } from './helpers/database';
import { loginUser } from './helpers/auth';

describe('Records Integration', () => {
  let seeded: Awaited<ReturnType<typeof seedTestData>>;

  beforeEach(async () => {
    await resetDatabase();
    seeded = await seedTestData();
  });

  it('applies role-based record visibility and ownership checks', async () => {
    const viewerTokens = await loginUser(seeded.users.viewer.email, seeded.users.viewer.password);
    const analystTokens = await loginUser(seeded.users.analyst.email, seeded.users.analyst.password);

    const viewerListResponse = await request(app)
      .get('/api/records')
      .set('Authorization', `Bearer ${viewerTokens.accessToken}`);

    expect(viewerListResponse.status).toBe(200);
    expect(viewerListResponse.body.data).toHaveLength(2);
    expect(
      viewerListResponse.body.data.every(
        (record: { createdById: string }) => record.createdById === seeded.users.viewer.id,
      ),
    ).toBe(true);

    const analystListResponse = await request(app)
      .get('/api/records')
      .set('Authorization', `Bearer ${analystTokens.accessToken}`);

    expect(analystListResponse.status).toBe(200);
    expect(analystListResponse.body.meta.total).toBe(5);

    const analystRecordResponse = await request(app)
      .get(`/api/records/${seeded.records.adminIncome.id}`)
      .set('Authorization', `Bearer ${analystTokens.accessToken}`);

    expect(analystRecordResponse.status).toBe(403);
  });

  it('lets admins create, update, and soft delete records with audit logs', async () => {
    const adminTokens = await loginUser(seeded.users.admin.email, seeded.users.admin.password);

    const createResponse = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminTokens.accessToken}`)
      .send({
        amount: 999.99,
        type: 'EXPENSE',
        category: ' Travel ',
        date: new Date().toISOString(),
        notes: 'Flight booking',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.category).toBe('travel');
    expect(createResponse.body.data.amount).toBe('999.99');

    const recordId = createResponse.body.data.id as string;

    const updateResponse = await request(app)
      .patch(`/api/records/${recordId}`)
      .set('Authorization', `Bearer ${adminTokens.accessToken}`)
      .send({
        category: ' Software ',
        notes: 'Updated expense',
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.category).toBe('software');

    const deleteResponse = await request(app)
      .delete(`/api/records/${recordId}`)
      .set('Authorization', `Bearer ${adminTokens.accessToken}`);

    expect(deleteResponse.status).toBe(200);

    const deletedRecord = await prisma.record.findUnique({
      where: {
        id: recordId,
      },
    });

    expect(deletedRecord?.deletedAt).not.toBeNull();

    const auditActions = await prisma.auditLog.findMany({
      where: {
        actorId: seeded.users.admin.id,
        entityId: recordId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    expect(auditActions.map((entry) => entry.action)).toEqual([
      'RECORD_CREATE',
      'RECORD_UPDATE',
      'RECORD_DELETE',
    ]);
  });

  it('rejects invalid sort fields through validation', async () => {
    const adminTokens = await loginUser(seeded.users.admin.email, seeded.users.admin.password);

    const response = await request(app)
      .get('/api/records?sortBy=role')
      .set('Authorization', `Bearer ${adminTokens.accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
