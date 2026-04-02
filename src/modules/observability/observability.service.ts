import { Prisma } from '@prisma/client';

import { prisma } from '../../config/prisma';
import { metricsRegistry } from '../../observability/metrics';

export const getLiveness = async () => {
  return {
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
  };
};

export const getReadiness = async () => {
  await prisma.$queryRaw(Prisma.sql`SELECT 1`);

  return {
    status: 'ready',
    database: 'up',
  };
};

export const getCombinedHealth = async () => {
  const [liveness, readiness] = await Promise.all([getLiveness(), getReadiness()]);

  return {
    status: 'ok',
    checks: {
      liveness,
      readiness,
    },
  };
};

export const getMetrics = async (): Promise<string> => {
  return metricsRegistry.metrics();
};
