import { z } from 'zod';

const emptyQuerySchema = z.object({});

export const dashboardSummarySchema = {
  query: emptyQuerySchema,
};

export const dashboardByCategorySchema = {
  query: emptyQuerySchema,
};

export const dashboardTrendsSchema = {
  query: emptyQuerySchema,
};

export const dashboardRecentSchema = {
  query: emptyQuerySchema,
};
