import 'dotenv/config';

import { PrismaClient, RecordType, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const usersToSeed = [
  {
    email: 'admin@finance.dev',
    name: 'Admin User',
    password: 'Admin@1234',
    role: Role.ADMIN,
  },
  {
    email: 'analyst@finance.dev',
    name: 'Analyst User',
    password: 'Analyst@1234',
    role: Role.ANALYST,
  },
  {
    email: 'viewer@finance.dev',
    name: 'Viewer User',
    password: 'Viewer@1234',
    role: Role.VIEWER,
  },
] as const;

const buildRecordSeed = (adminId: string, analystId: string, viewerId: string) => [
  {
    amount: '14500.00',
    type: RecordType.INCOME,
    category: 'salary',
    date: new Date('2025-04-05T09:00:00.000Z'),
    notes: 'April payroll',
    createdById: adminId,
  },
  {
    amount: '3200.00',
    type: RecordType.EXPENSE,
    category: 'operations',
    date: new Date('2025-04-12T10:30:00.000Z'),
    notes: 'Cloud infrastructure invoice',
    createdById: adminId,
  },
  {
    amount: '9800.00',
    type: RecordType.INCOME,
    category: 'consulting',
    date: new Date('2025-05-03T08:00:00.000Z'),
    notes: 'Consulting retainer',
    createdById: analystId,
  },
  {
    amount: '1450.00',
    type: RecordType.EXPENSE,
    category: 'software',
    date: new Date('2025-05-15T15:15:00.000Z'),
    notes: 'Analytics subscriptions',
    createdById: analystId,
  },
  {
    amount: '4100.00',
    type: RecordType.INCOME,
    category: 'freelance',
    date: new Date('2025-05-21T18:00:00.000Z'),
    notes: 'Freelance milestone payment',
    createdById: viewerId,
  },
  {
    amount: '1250.00',
    type: RecordType.EXPENSE,
    category: 'travel',
    date: new Date('2025-06-09T11:20:00.000Z'),
    notes: 'Client site visit',
    createdById: adminId,
  },
  {
    amount: '14950.00',
    type: RecordType.INCOME,
    category: 'salary',
    date: new Date('2025-06-28T09:05:00.000Z'),
    notes: 'June payroll',
    createdById: adminId,
  },
  {
    amount: '860.00',
    type: RecordType.EXPENSE,
    category: 'utilities',
    date: new Date('2025-07-02T07:45:00.000Z'),
    notes: 'Office utilities',
    createdById: analystId,
  },
  {
    amount: '5100.00',
    type: RecordType.INCOME,
    category: 'investments',
    date: new Date('2025-07-11T14:10:00.000Z'),
    notes: 'Quarterly dividend distribution',
    createdById: viewerId,
  },
  {
    amount: '2140.00',
    type: RecordType.EXPENSE,
    category: 'marketing',
    date: new Date('2025-07-19T16:00:00.000Z'),
    notes: 'Campaign spend',
    createdById: adminId,
  },
  {
    amount: '9950.00',
    type: RecordType.INCOME,
    category: 'consulting',
    date: new Date('2025-08-01T08:20:00.000Z'),
    notes: 'Transformation workshop',
    createdById: analystId,
  },
  {
    amount: '1875.00',
    type: RecordType.EXPENSE,
    category: 'rent',
    date: new Date('2025-08-07T05:40:00.000Z'),
    notes: 'Workspace lease',
    createdById: viewerId,
  },
  {
    amount: '15200.00',
    type: RecordType.INCOME,
    category: 'salary',
    date: new Date('2025-09-04T09:00:00.000Z'),
    notes: 'September payroll',
    createdById: adminId,
  },
  {
    amount: '940.00',
    type: RecordType.EXPENSE,
    category: 'software',
    date: new Date('2025-09-18T13:25:00.000Z'),
    notes: 'Security tooling',
    createdById: analystId,
  },
  {
    amount: '3650.00',
    type: RecordType.INCOME,
    category: 'freelance',
    date: new Date('2025-10-06T12:00:00.000Z'),
    notes: 'Product design engagement',
    createdById: viewerId,
  },
  {
    amount: '1320.00',
    type: RecordType.EXPENSE,
    category: 'travel',
    date: new Date('2025-10-16T06:50:00.000Z'),
    notes: 'Regional finance summit',
    createdById: adminId,
  },
  {
    amount: '10800.00',
    type: RecordType.INCOME,
    category: 'consulting',
    date: new Date('2025-11-05T08:10:00.000Z'),
    notes: 'Revenue forecast advisory',
    createdById: analystId,
  },
  {
    amount: '690.00',
    type: RecordType.EXPENSE,
    category: 'food',
    date: new Date('2025-11-10T19:30:00.000Z'),
    notes: 'Team dinner reimbursement',
    createdById: viewerId,
  },
  {
    amount: '15800.00',
    type: RecordType.INCOME,
    category: 'salary',
    date: new Date('2025-12-03T09:00:00.000Z'),
    notes: 'Year-end payroll',
    createdById: adminId,
  },
  {
    amount: '2460.00',
    type: RecordType.EXPENSE,
    category: 'tax',
    date: new Date('2025-12-23T11:45:00.000Z'),
    notes: 'Quarterly tax advance',
    createdById: analystId,
  },
  {
    amount: '4250.00',
    type: RecordType.INCOME,
    category: 'investments',
    date: new Date('2026-01-08T10:00:00.000Z'),
    notes: 'January dividend income',
    createdById: viewerId,
  },
  {
    amount: '980.00',
    type: RecordType.EXPENSE,
    category: 'utilities',
    date: new Date('2026-01-21T08:35:00.000Z'),
    notes: 'January utilities',
    createdById: adminId,
  },
  {
    amount: '11150.00',
    type: RecordType.INCOME,
    category: 'consulting',
    date: new Date('2026-02-04T08:55:00.000Z'),
    notes: 'Liquidity planning engagement',
    createdById: analystId,
  },
  {
    amount: '1425.00',
    type: RecordType.EXPENSE,
    category: 'software',
    date: new Date('2026-02-11T09:20:00.000Z'),
    notes: 'Accounting suite renewal',
    createdById: viewerId,
  },
  {
    amount: '16200.00',
    type: RecordType.INCOME,
    category: 'salary',
    date: new Date('2026-03-05T09:00:00.000Z'),
    notes: 'March payroll',
    createdById: adminId,
  },
  {
    amount: '1750.00',
    type: RecordType.EXPENSE,
    category: 'marketing',
    date: new Date('2026-03-13T14:40:00.000Z'),
    notes: 'Market research spend',
    createdById: analystId,
  },
  {
    amount: '3900.00',
    type: RecordType.INCOME,
    category: 'freelance',
    date: new Date('2026-03-20T16:15:00.000Z'),
    notes: 'Retention bonus project',
    createdById: viewerId,
  },
  {
    amount: '815.00',
    type: RecordType.EXPENSE,
    category: 'food',
    date: new Date('2026-03-25T18:10:00.000Z'),
    notes: 'Client lunch and hospitality',
    createdById: adminId,
  },
];

const main = async (): Promise<void> => {
  const hashedPasswords = await Promise.all(
    usersToSeed.map(async (user) => ({
      ...user,
      passwordHash: await bcrypt.hash(user.password, 12),
    })),
  );

  const adminSeed = hashedPasswords.find((user) => user.role === Role.ADMIN);
  const analystSeed = hashedPasswords.find((user) => user.role === Role.ANALYST);
  const viewerSeed = hashedPasswords.find((user) => user.role === Role.VIEWER);

  if (!adminSeed || !analystSeed || !viewerSeed) {
    throw new Error('Seed users are incomplete.');
  }

  const admin = await prisma.user.upsert({
    where: { email: adminSeed.email },
    update: {
      name: adminSeed.name,
      passwordHash: adminSeed.passwordHash,
      role: adminSeed.role,
      isActive: true,
    },
    create: {
      email: adminSeed.email,
      name: adminSeed.name,
      passwordHash: adminSeed.passwordHash,
      role: adminSeed.role,
    },
  });

  const analyst = await prisma.user.upsert({
    where: { email: analystSeed.email },
    update: {
      name: analystSeed.name,
      passwordHash: analystSeed.passwordHash,
      role: analystSeed.role,
      isActive: true,
    },
    create: {
      email: analystSeed.email,
      name: analystSeed.name,
      passwordHash: analystSeed.passwordHash,
      role: analystSeed.role,
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: viewerSeed.email },
    update: {
      name: viewerSeed.name,
      passwordHash: viewerSeed.passwordHash,
      role: viewerSeed.role,
      isActive: true,
    },
    create: {
      email: viewerSeed.email,
      name: viewerSeed.name,
      passwordHash: viewerSeed.passwordHash,
      role: viewerSeed.role,
    },
  });

  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.record.deleteMany();

  await prisma.record.createMany({
    data: buildRecordSeed(admin.id, analyst.id, viewer.id),
  });
};

void main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Database seed failed.';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
