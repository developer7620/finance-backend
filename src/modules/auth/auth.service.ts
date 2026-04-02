import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { AuditAction, AuditEntityType, Prisma, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';

import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { createAuditLogWithClient } from '../audit/audit.service';
import type {
  LoginRequestBody,
  LogoutRequestBody,
  RefreshRequestBody,
  RegisterRequestBody,
} from '../../validators/auth.validator';

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.UserSelect;

type AuthUser = Prisma.UserGetPayload<{
  select: typeof userSelect;
}>;

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const serializeUser = (user: AuthUser) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const signAccessToken = (user: AuthUser): string => {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
};

const createRefreshToken = (): string => randomBytes(64).toString('hex');

const hashRefreshToken = (refreshToken: string): string =>
  createHash('sha256').update(refreshToken).digest('hex');

const calculateRefreshTokenExpiry = (): Date => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS);
  return expiresAt;
};

const createRefreshTokenRecord = async (
  client: Prisma.TransactionClient,
  userId: string,
  family?: string,
) => {
  const rawRefreshToken = createRefreshToken();
  const refreshTokenRecord = await client.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(rawRefreshToken),
      family: family ?? randomUUID(),
      userId,
      expiresAt: calculateRefreshTokenExpiry(),
    },
  });

  return {
    rawRefreshToken,
    refreshTokenRecord,
  };
};

const issueAuthTokens = async (
  client: Prisma.TransactionClient,
  user: AuthUser,
  family?: string,
) => {
  const { rawRefreshToken, refreshTokenRecord } = await createRefreshTokenRecord(client, user.id, family);

  return {
    accessToken: signAccessToken(user),
    refreshToken: rawRefreshToken,
    refreshTokenExpiresAt: refreshTokenRecord.expiresAt,
    refreshTokenId: refreshTokenRecord.id,
  };
};

export const registerUser = async (input: RegisterRequestBody) => {
  const email = normalizeEmail(input.email);

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new ApiError(409, 'CONFLICT', 'An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  return prisma.$transaction(async (client) => {
    const user = await client.user.create({
      data: {
        email,
        name: input.name.trim(),
        passwordHash,
        role: Role.VIEWER,
      },
      select: userSelect,
    });

    const tokens = await issueAuthTokens(client, user);

    await createAuditLogWithClient(client, {
      action: AuditAction.AUTH_REGISTER,
      entityType: AuditEntityType.USER,
      entityId: user.id,
      actorId: user.id,
      metadata: {
        email: user.email,
        role: user.role,
      },
    });

    return {
      user: serializeUser(user),
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      },
    };
  });
};

export const loginUser = async (input: LoginRequestBody) => {
  const email = normalizeEmail(input.email);

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      ...userSelect,
      passwordHash: true,
    },
  });

  if (!user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid email or password.');
  }

  if (!user.isActive) {
    throw new ApiError(401, 'UNAUTHORIZED', 'User account is inactive.');
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid email or password.');
  }

  const { passwordHash: _passwordHash, ...safeUser } = user;

  return prisma.$transaction(async (client) => {
    const tokens = await issueAuthTokens(client, safeUser);

    await createAuditLogWithClient(client, {
      action: AuditAction.AUTH_LOGIN,
      entityType: AuditEntityType.AUTH,
      entityId: safeUser.id,
      actorId: safeUser.id,
      metadata: {
        email: safeUser.email,
      },
    });

    return {
      user: serializeUser(safeUser),
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      },
    };
  });
};

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  if (!user || !user.isActive) {
    throw new ApiError(401, 'UNAUTHORIZED', 'User account is inactive or no longer exists.');
  }

  return serializeUser(user);
};

export const refreshSession = async (input: RefreshRequestBody) => {
  const hashedRefreshToken = hashRefreshToken(input.refreshToken);

  const existingRefreshToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash: hashedRefreshToken,
    },
    include: {
      user: {
        select: userSelect,
      },
    },
  });

  if (!existingRefreshToken) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Refresh token is invalid.');
  }

  if (!existingRefreshToken.user.isActive) {
    throw new ApiError(401, 'UNAUTHORIZED', 'User account is inactive.');
  }

  if (existingRefreshToken.expiresAt <= new Date()) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Refresh token has expired.');
  }

  if (existingRefreshToken.revokedAt) {
    await prisma.$transaction(async (client) => {
      await client.refreshToken.updateMany({
        where: {
          family: existingRefreshToken.family,
          userId: existingRefreshToken.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      await createAuditLogWithClient(client, {
        action: AuditAction.AUTH_REFRESH_REUSE,
        entityType: AuditEntityType.REFRESH_TOKEN,
        entityId: existingRefreshToken.id,
        actorId: existingRefreshToken.userId,
        metadata: {
          family: existingRefreshToken.family,
        },
      });
    });

    throw new ApiError(
      401,
      'UNAUTHORIZED',
      'Refresh token reuse detected. All active sessions have been revoked.',
    );
  }

  return prisma.$transaction(async (client) => {
    const nextTokens = await issueAuthTokens(client, existingRefreshToken.user, existingRefreshToken.family);

    await client.refreshToken.update({
      where: {
        id: existingRefreshToken.id,
      },
      data: {
        revokedAt: new Date(),
        replacedById: nextTokens.refreshTokenId,
      },
    });

    await createAuditLogWithClient(client, {
      action: AuditAction.AUTH_REFRESH,
      entityType: AuditEntityType.REFRESH_TOKEN,
      entityId: nextTokens.refreshTokenId,
      actorId: existingRefreshToken.userId,
      metadata: {
        rotatedFromId: existingRefreshToken.id,
        family: existingRefreshToken.family,
      },
    });

    return {
      user: serializeUser(existingRefreshToken.user),
      tokens: {
        accessToken: nextTokens.accessToken,
        refreshToken: nextTokens.refreshToken,
        refreshTokenExpiresAt: nextTokens.refreshTokenExpiresAt,
      },
    };
  });
};

export const logoutSession = async (input: LogoutRequestBody) => {
  const hashedRefreshToken = hashRefreshToken(input.refreshToken);

  const existingRefreshToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash: hashedRefreshToken,
    },
    select: {
      id: true,
      userId: true,
      revokedAt: true,
    },
  });

  if (!existingRefreshToken) {
    return {
      revoked: false,
      message: 'Session already invalidated.',
    };
  }

  if (existingRefreshToken.revokedAt) {
    return {
      revoked: false,
      message: 'Session already invalidated.',
    };
  }

  await prisma.$transaction(async (client) => {
    await client.refreshToken.update({
      where: {
        id: existingRefreshToken.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    await createAuditLogWithClient(client, {
      action: AuditAction.AUTH_LOGOUT,
      entityType: AuditEntityType.REFRESH_TOKEN,
      entityId: existingRefreshToken.id,
      actorId: existingRefreshToken.userId,
    });
  });

  return {
    revoked: true,
    message: 'Session revoked successfully.',
  };
};

export const logoutFromAllSessions = async (userId: string) => {
  const result = await prisma.$transaction(async (client) => {
    const revokedSessions = await client.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    await createAuditLogWithClient(client, {
      action: AuditAction.AUTH_LOGOUT_ALL,
      entityType: AuditEntityType.AUTH,
      entityId: userId,
      actorId: userId,
      metadata: {
        revokedSessions: revokedSessions.count,
      },
    });

    return revokedSessions.count;
  });

  return {
    revokedSessions: result,
    message: 'All sessions revoked successfully.',
  };
};
