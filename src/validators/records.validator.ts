import { RecordType } from '@prisma/client';
import { z } from 'zod';

const isoDatePattern =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/;

const amountSchema = z
  .number({
    invalid_type_error: 'Amount must be a number.',
    required_error: 'Amount is required.',
  })
  .positive('Amount must be greater than zero.')
  .refine((value) => Number.isInteger(value * 100), {
    message: 'Amount must have at most 2 decimal places.',
  });

const categorySchema = z
  .string()
  .min(1, 'Category is required.')
  .refine((value) => value.trim().length > 0, 'Category is required.');

const isoDateSchema = z
  .string()
  .refine((value) => isoDatePattern.test(value) && !Number.isNaN(new Date(value).getTime()), {
    message: 'Date must be a valid ISO date string.',
  })
  .refine((value) => new Date(value).getTime() <= Date.now(), {
    message: 'Date cannot be in the future.',
  });

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

const sortBySchema = z.enum(['date', 'amount', 'createdAt']);
const sortOrderSchema = z.enum(['asc', 'desc']);

export const recordParamsSchema = {
  params: z.object({
    id: z.string().cuid('Record id must be a valid cuid.'),
  }),
};

export const createRecordSchema = {
  body: z.object({
    amount: amountSchema,
    type: z.nativeEnum(RecordType, {
      errorMap: () => ({ message: 'Type must be either INCOME or EXPENSE.' }),
    }),
    category: categorySchema,
    date: isoDateSchema,
    notes: z.string().max(500, 'Notes must be 500 characters or less.').optional(),
  }),
};

export const updateRecordSchema = {
  params: recordParamsSchema.params,
  body: z
    .object({
      amount: amountSchema.optional(),
      type: z.nativeEnum(RecordType).optional(),
      category: categorySchema.optional(),
      date: isoDateSchema.optional(),
      notes: z.string().max(500, 'Notes must be 500 characters or less.').nullable().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field is required for update.',
    }),
};

export const listRecordsSchema = {
  query: paginationSchema
    .extend({
      type: z.nativeEnum(RecordType).optional(),
      category: z.string().min(1, 'Category cannot be empty.').optional(),
      dateFrom: isoDateSchema.optional(),
      dateTo: isoDateSchema.optional(),
      sortBy: sortBySchema.default('date'),
      sortOrder: sortOrderSchema.default('desc'),
    })
    .refine(
      (value) =>
        !value.dateFrom || !value.dateTo || new Date(value.dateFrom).getTime() <= new Date(value.dateTo).getTime(),
      {
        message: 'dateFrom must be earlier than or equal to dateTo.',
        path: ['dateFrom'],
      },
    ),
};

export type RecordParams = z.infer<typeof recordParamsSchema.params>;
export type CreateRecordBody = z.infer<typeof createRecordSchema.body>;
export type UpdateRecordBody = z.infer<typeof updateRecordSchema.body>;
export type ListRecordsQuery = z.infer<typeof listRecordsSchema.query>;
