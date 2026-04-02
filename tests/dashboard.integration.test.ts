import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import app from '../src/app';
import { resetDatabase, seedTestData } from './helpers/database';
import { loginUser } from './helpers/auth';

const monthLabel = (monthsAgo: number): string => {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1));
  return date.toISOString().slice(0, 7);
};

describe('Dashboard Integration', () => {
  let seeded: Awaited<ReturnType<typeof seedTestData>>;

  beforeEach(async () => {
    await resetDatabase();
    seeded = await seedTestData();
  });

  it('returns viewer-scoped dashboard metrics', async () => {
    const viewerTokens = await loginUser(seeded.users.viewer.email, seeded.users.viewer.password);

    const summaryResponse = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${viewerTokens.accessToken}`);

    expect(summaryResponse.status).toBe(200);
    expect(summaryResponse.body.data).toEqual({
      totalIncome: '1500.00',
      totalExpenses: '800.00',
      netBalance: '700.00',
    });

    const categoryResponse = await request(app)
      .get('/api/dashboard/by-category')
      .set('Authorization', `Bearer ${viewerTokens.accessToken}`);

    expect(categoryResponse.status).toBe(200);
    expect(categoryResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'freelance',
          incomeTotal: '1500.00',
        }),
        expect.objectContaining({
          category: 'rent',
          expenseTotal: '800.00',
        }),
      ]),
    );
  });

  it('returns 12 months of trends and recent transactions for admins', async () => {
    const adminTokens = await loginUser(seeded.users.admin.email, seeded.users.admin.password);

    const trendsResponse = await request(app)
      .get('/api/dashboard/trends')
      .set('Authorization', `Bearer ${adminTokens.accessToken}`);

    expect(trendsResponse.status).toBe(200);
    expect(trendsResponse.body.data).toHaveLength(12);

    const currentMonth = trendsResponse.body.data.find(
      (entry: { month: string }) => entry.month === monthLabel(0),
    );
    const previousMonth = trendsResponse.body.data.find(
      (entry: { month: string }) => entry.month === monthLabel(1),
    );
    const secondPreviousMonth = trendsResponse.body.data.find(
      (entry: { month: string }) => entry.month === monthLabel(2),
    );

    expect(currentMonth).toEqual(
      expect.objectContaining({
        income: '5000.00',
        expense: '1200.00',
      }),
    );
    expect(previousMonth).toEqual(
      expect.objectContaining({
        income: '4500.00',
        expense: '0.00',
      }),
    );
    expect(secondPreviousMonth).toEqual(
      expect.objectContaining({
        income: '0.00',
        expense: '800.00',
      }),
    );

    const recentResponse = await request(app)
      .get('/api/dashboard/recent')
      .set('Authorization', `Bearer ${adminTokens.accessToken}`);

    expect(recentResponse.status).toBe(200);
    expect(recentResponse.body.data.length).toBeLessThanOrEqual(10);
    expect(new Date(recentResponse.body.data[0].date).getTime()).toBeGreaterThanOrEqual(
      new Date(recentResponse.body.data[1].date).getTime(),
    );
  });
});
