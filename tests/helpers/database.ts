import { RecordType, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

import { prisma } from '../../src/config/prisma';

const PASSWORDS = {
  admin: 'Admin@1234',
  analyst: 'Analyst@1234',
  viewer: 'Viewer@1234',
} as const;

const monthsAgo = (value: number): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - value, 10, 12, 0, 0));
};

export const resetDatabase = async (): Promise<void> => {
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.record.deleteMany();
  await prisma.user.deleteMany();
};

export const seedTestData = async () => {
  const [adminPasswordHash, analystPasswordHash, viewerPasswordHash] = await Promise.all([
    bcrypt.hash(PASSWORDS.admin, 12),
    bcrypt.hash(PASSWORDS.analyst, 12),
    bcrypt.hash(PASSWORDS.viewer, 12),
  ]);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@finance.dev',
      name: 'Admin User',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const analyst = await prisma.user.create({
    data: {
      email: 'analyst@finance.dev',
      name: 'Analyst User',
      passwordHash: analystPasswordHash,
      role: Role.ANALYST,
    },
  });

  const viewer = await prisma.user.create({
    data: {
      email: 'viewer@finance.dev',
      name: 'Viewer User',
      passwordHash: viewerPasswordHash,
      role: Role.VIEWER,
    },
  });

  const adminIncome = await prisma.record.create({
    data: {
      amount: 5000,
      type: RecordType.INCOME,
      category: 'salary',
      date: monthsAgo(0),
      notes: 'Current month salary',
      createdById: admin.id,
    },
  });

  const adminExpense = await prisma.record.create({
    data: {
      amount: 1200,
      type: RecordType.EXPENSE,
      category: 'operations',
      date: monthsAgo(0),
      notes: 'Current month operations',
      createdById: admin.id,
    },
  });

  const analystIncome = await prisma.record.create({
    data: {
      amount: 3000,
      type: RecordType.INCOME,
      category: 'consulting',
      date: monthsAgo(1),
      notes: 'Analyst consulting income',
      createdById: analyst.id,
    },
  });

  const viewerExpense = await prisma.record.create({
    data: {
      amount: 800,
      type: RecordType.EXPENSE,
      category: 'rent',
      date: monthsAgo(2),
      notes: 'Viewer rent expense',
      createdById: viewer.id,
    },
  });

  const viewerIncome = await prisma.record.create({
    data: {
      amount: 1500,
      type: RecordType.INCOME,
      category: 'freelance',
      date: monthsAgo(1),
      notes: 'Viewer freelance income',
      createdById: viewer.id,
    },
  });

  return {
    users: {
      admin: {
        ...admin,
        password: PASSWORDS.admin,
      },
      analyst: {
        ...analyst,
        password: PASSWORDS.analyst,
      },
      viewer: {
        ...viewer,
        password: PASSWORDS.viewer,
      },
    },
    records: {
      adminIncome,
      adminExpense,
      analystIncome,
      viewerExpense,
      viewerIncome,
    },
  };
};
