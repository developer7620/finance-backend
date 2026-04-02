import { AuditAction, AuditEntityType, Prisma } from '@prisma/client';

import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import type { PaginationMeta } from '../../utils/ApiResponse';
import { createAuditLogWithClient } from '../audit/audit.service';
import type { ListUsersQuery, UpdateUserBody } from '../../validators/users.validator';

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.UserSelect;

type SafeUser = Prisma.UserGetPayload<{
  select: typeof userSelect;
}>;

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const serializeUser = (user: SafeUser) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const buildPaginationMeta = (page: number, limit: number, total: number): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});

export const listUsers = async (query: ListUsersQuery) => {
  const skip = (query.page - 1) * query.limit;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      skip,
      take: query.limit,
      orderBy: { createdAt: 'desc' },
      select: userSelect,
    }),
    prisma.user.count(),
  ]);

  return {
    users: users.map(serializeUser),
    meta: buildPaginationMeta(query.page, query.limit, total),
  };
};

export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });

  if (!user) {
    throw new ApiError(404, 'NOT_FOUND', 'User not found.');
  }

  return serializeUser(user);
};

export const updateUserById = async (id: string, input: UpdateUserBody, actorId: string) => {
  const data: Prisma.UserUpdateInput = {};

  if (input.name !== undefined) {
    data.name = input.name.trim();
  }

  if (input.email !== undefined) {
    data.email = normalizeEmail(input.email);
  }

  if (input.role !== undefined) {
    data.role = input.role;
  }

  return prisma.$transaction(async (client) => {
    const user = await client.user.update({
      where: { id },
      data,
      select: userSelect,
    });

    await createAuditLogWithClient(client, {
      action: AuditAction.USER_UPDATE,
      entityType: AuditEntityType.USER,
      entityId: user.id,
      actorId,
      metadata: {
        updatedFields: Object.keys(input),
      },
    });

    return serializeUser(user);
  });
};

export const deactivateUserById = async (id: string, actorId: string) => {
  if (id === actorId) {
    throw new ApiError(400, 'BAD_REQUEST', 'Users cannot deactivate their own account.');
  }

  return prisma.$transaction(async (client) => {
    const user = await client.user.update({
      where: { id },
      data: { isActive: false },
      select: userSelect,
    });

    await client.refreshToken.updateMany({
      where: {
        userId: id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    await createAuditLogWithClient(client, {
      action: AuditAction.USER_DEACTIVATE,
      entityType: AuditEntityType.USER,
      entityId: user.id,
      actorId,
    });

    return serializeUser(user);
  });
};
