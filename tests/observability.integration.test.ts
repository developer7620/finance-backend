import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import app from '../src/app';
import { resetDatabase, seedTestData } from './helpers/database';

describe('Observability Integration', () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedTestData();
  });

  it('exposes health endpoints, metrics, tracing headers, and API docs', async () => {
    const healthResponse = await request(app).get('/health');

    expect(healthResponse.status).toBe(200);
    expect(healthResponse.body.data.status).toBe('ok');
    expect(healthResponse.body.data.checks.readiness.database).toBe('up');
    expect(healthResponse.headers['x-request-id']).toEqual(expect.any(String));
    expect(healthResponse.headers['x-trace-id']).toEqual(expect.any(String));

    const metricsResponse = await request(app).get('/metrics');

    expect(metricsResponse.status).toBe(200);
    expect(metricsResponse.text).toContain('finance_backend_http_requests_total');

    const openApiResponse = await request(app).get('/openapi.json');

    expect(openApiResponse.status).toBe(200);
    expect(openApiResponse.body.openapi).toBe('3.1.0');
    expect(openApiResponse.body.paths['/api/auth/refresh']).toBeDefined();

    const docsResponse = await request(app).get('/docs');

    expect(docsResponse.status).toBe(301);
  });
});
