import type { Role } from '@prisma/client';

export type Permission =
  | 'records:read:own'
  | 'records:read:all'
  | 'records:create'
  | 'records:update'
  | 'records:delete'
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:deactivate'
  | 'dashboard:read';

export const PERMISSIONS: Record<Role, Permission[]> = {
  VIEWER: ['records:read:own', 'dashboard:read'],
  ANALYST: ['records:read:all', 'dashboard:read'],
  ADMIN: [
    'records:read:all',
    'records:create',
    'records:update',
    'records:delete',
    'users:read',
    'users:create',
    'users:update',
    'users:deactivate',
    'dashboard:read',
  ],
};

export const hasPermission = (role: Role, requiredPermission: Permission | Permission[]): boolean => {
  const requiredPermissions = Array.isArray(requiredPermission)
    ? requiredPermission
    : [requiredPermission];

  return requiredPermissions.some((permission) => PERMISSIONS[role].includes(permission));
};
