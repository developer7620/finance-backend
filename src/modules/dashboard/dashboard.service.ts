import { Prisma, Role } from '@prisma/client';

import { prisma } from '../../config/prisma';
import type { RequestUser } from '../../types/express';

interface SummaryRow {
  totalIncome: string;
  totalExpenses: string;
  netBalance: string;
}

interface CategoryRow {
  category: string;
  incomeTotal: string;
  expenseTotal: string;
  netTotal: string;
}

interface TrendRow {
  month: string;
  income: string;
  expense: string;
}

interface RecentRow {
  id: string;
  amount: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  date: Date;
  notes: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  creatorRole: Role;
}

const viewerScope = (user: RequestUser): Prisma.Sql =>
  user.role === Role.VIEWER ? Prisma.sql` AND r."createdById" = ${user.id}` : Prisma.empty;

export const getSummary = async (user: RequestUser) => {
  const [row] = await prisma.$queryRaw<SummaryRow[]>(Prisma.sql`
    SELECT
      COALESCE(SUM(CASE WHEN r."type" = 'INCOME' THEN r."amount" ELSE 0 END), 0)::numeric(18, 2)::text AS "totalIncome",
      COALESCE(SUM(CASE WHEN r."type" = 'EXPENSE' THEN r."amount" ELSE 0 END), 0)::numeric(18, 2)::text AS "totalExpenses",
      COALESCE(
        SUM(
          CASE
            WHEN r."type" = 'INCOME' THEN r."amount"
            WHEN r."type" = 'EXPENSE' THEN -r."amount"
            ELSE 0
          END
        ),
        0
      )::numeric(18, 2)::text AS "netBalance"
    FROM "Record" r
    WHERE r."deletedAt" IS NULL
    ${viewerScope(user)}
  `);

  return row ?? {
    totalIncome: '0.00',
    totalExpenses: '0.00',
    netBalance: '0.00',
  };
};

export const getCategoryTotals = async (user: RequestUser) => {
  const rows = await prisma.$queryRaw<CategoryRow[]>(Prisma.sql`
    SELECT
      r."category" AS "category",
      COALESCE(SUM(CASE WHEN r."type" = 'INCOME' THEN r."amount" ELSE 0 END), 0)::numeric(18, 2)::text AS "incomeTotal",
      COALESCE(SUM(CASE WHEN r."type" = 'EXPENSE' THEN r."amount" ELSE 0 END), 0)::numeric(18, 2)::text AS "expenseTotal",
      COALESCE(
        SUM(
          CASE
            WHEN r."type" = 'INCOME' THEN r."amount"
            WHEN r."type" = 'EXPENSE' THEN -r."amount"
            ELSE 0
          END
        ),
        0
      )::numeric(18, 2)::text AS "netTotal"
    FROM "Record" r
    WHERE r."deletedAt" IS NULL
    ${viewerScope(user)}
    GROUP BY r."category"
    ORDER BY r."category" ASC
  `);

  return rows;
};

export const getMonthlyTrends = async (user: RequestUser) => {
  const rows = await prisma.$queryRaw<TrendRow[]>(Prisma.sql`
    WITH months AS (
      SELECT generate_series(
        DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months',
        DATE_TRUNC('month', CURRENT_DATE),
        INTERVAL '1 month'
      ) AS month_start
    ),
    aggregated AS (
      SELECT
        DATE_TRUNC('month', r."date") AS month_start,
        COALESCE(SUM(CASE WHEN r."type" = 'INCOME' THEN r."amount" ELSE 0 END), 0)::numeric(18, 2)::text AS income,
        COALESCE(SUM(CASE WHEN r."type" = 'EXPENSE' THEN r."amount" ELSE 0 END), 0)::numeric(18, 2)::text AS expense
      FROM "Record" r
      WHERE r."deletedAt" IS NULL
      ${viewerScope(user)}
        AND r."date" >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
        AND r."date" < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      GROUP BY DATE_TRUNC('month', r."date")
    )
    SELECT
      TO_CHAR(months.month_start, 'YYYY-MM') AS "month",
      COALESCE(aggregated.income, '0.00') AS "income",
      COALESCE(aggregated.expense, '0.00') AS "expense"
    FROM months
    LEFT JOIN aggregated ON aggregated.month_start = months.month_start
    ORDER BY months.month_start ASC
  `);

  return rows;
};

export const getRecentTransactions = async (user: RequestUser) => {
  const rows = await prisma.$queryRaw<RecentRow[]>(Prisma.sql`
    SELECT
      r."id" AS "id",
      r."amount"::text AS "amount",
      r."type" AS "type",
      r."category" AS "category",
      r."date" AS "date",
      r."notes" AS "notes",
      r."createdById" AS "createdById",
      r."createdAt" AS "createdAt",
      r."updatedAt" AS "updatedAt",
      u."id" AS "creatorId",
      u."name" AS "creatorName",
      u."email" AS "creatorEmail",
      u."role" AS "creatorRole"
    FROM "Record" r
    INNER JOIN "User" u ON u."id" = r."createdById"
    WHERE r."deletedAt" IS NULL
    ${viewerScope(user)}
    ORDER BY r."date" DESC, r."createdAt" DESC
    LIMIT 10
  `);

  return rows.map((row) => ({
    id: row.id,
    amount: row.amount,
    type: row.type,
    category: row.category,
    date: row.date,
    notes: row.notes,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: {
      id: row.creatorId,
      name: row.creatorName,
      email: row.creatorEmail,
      role: row.creatorRole,
    },
  }));
};
