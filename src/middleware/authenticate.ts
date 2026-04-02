import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

const extractBearerToken = (authorizationHeader?: string): string => {
  if (!authorizationHeader) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication token is required.');
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authorization header must be in the format: Bearer <token>.');
  }

  return token;
};

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (typeof decoded !== 'object' || decoded === null || !('sub' in decoded) || typeof decoded.sub !== 'string') {
      throw new ApiError(401, 'UNAUTHORIZED', 'Invalid access token payload.');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new ApiError(401, 'UNAUTHORIZED', 'User account is inactive or no longer exists.');
    }

    req.user = user;
    next();
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Access token has expired.'));
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Invalid access token.'));
    }

    return next(error);
  }
};
