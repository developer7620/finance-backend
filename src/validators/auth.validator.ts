import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long.')
  .regex(/\d/, 'Password must contain at least one number.');

export const registerSchema = {
  body: z.object({
    name: z
      .string()
      .min(1, 'Name is required.')
      .refine((value) => value.trim().length > 0, 'Name is required.'),
    email: z.string().email('Email must be a valid email address.'),
    password: passwordSchema,
  }),
};

export const loginSchema = {
  body: z.object({
    email: z.string().email('Email must be a valid email address.'),
    password: passwordSchema,
  }),
};

export const refreshSchema = {
  body: z.object({
    refreshToken: z.string().min(64, 'Refresh token is required.'),
  }),
};

export const logoutSchema = {
  body: z.object({
    refreshToken: z.string().min(64, 'Refresh token is required.'),
  }),
};

export type RegisterRequestBody = z.infer<typeof registerSchema.body>;
export type LoginRequestBody = z.infer<typeof loginSchema.body>;
export type RefreshRequestBody = z.infer<typeof refreshSchema.body>;
export type LogoutRequestBody = z.infer<typeof logoutSchema.body>;
