import type { RequestHandler } from 'express';

import { hasPermission, type Permission } from '../config/permissions';
import { ApiError } from '../utils/ApiError';

export const authorize = (requiredPermission: Permission | Permission[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.'));
    }

    if (!hasPermission(req.user.role, requiredPermission)) {
      const permissionLabel = Array.isArray(requiredPermission)
        ? requiredPermission.join(' or ')
        : requiredPermission;

      return next(
        new ApiError(
          403,
          'FORBIDDEN',
          `Role ${req.user.role} does not have permission: ${permissionLabel}.`,
        ),
      );
    }

    return next();
  };
};
