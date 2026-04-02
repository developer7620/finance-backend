import { afterAll, beforeAll } from 'vitest';

import { prisma } from '../src/config/prisma';

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});
