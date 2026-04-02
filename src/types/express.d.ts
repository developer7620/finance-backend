import type { Role } from '@prisma/client';

export interface RequestUser {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
      requestId?: string;
      traceId?: string;
    }
  }
}

export {};
