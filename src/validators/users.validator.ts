import { Role } from '@prisma/client';
import { z } from 'zod';

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const userParamsSchema = {
  params: z.object({
    id: z.string().cuid('User id must be a valid cuid.'),
  }),
};

export const listUsersSchema = {
  query: paginationSchema,
};

export const updateUserSchema = {
  params: userParamsSchema.params,
  body: z
    .object({
      name: z
        .string()
        .min(1, 'Name cannot be empty.')
        .refine((value) => value.trim().length > 0, 'Name cannot be empty.')
        .optional(),
      email: z.string().email('Email must be a valid email address.').optional(),
      role: z.nativeEnum(Role).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field is required for update.',
    }),
};

export type UserParams = z.infer<typeof userParamsSchema.params>;
export type ListUsersQuery = z.infer<typeof listUsersSchema.query>;
export type UpdateUserBody = z.infer<typeof updateUserSchema.body>;
