import { type AuditAction, type AuditEntityType, Prisma, type PrismaClient } from '@prisma/client';

import { prisma } from '../../config/prisma';
import { getRequestContext } from '../../middleware/requestContext';

type AuditClient = Prisma.TransactionClient | PrismaClient;

interface CreateAuditLogInput {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  actorId?: string;
  metadata?: Prisma.InputJsonValue;
}

const buildAuditLogData = (input: CreateAuditLogInput): Prisma.AuditLogUncheckedCreateInput => {
  const context = getRequestContext();

  return {
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    actorId: input.actorId,
    metadata: input.metadata,
    ipAddress: context?.ipAddress,
    userAgent: context?.userAgent,
    requestId: context?.requestId,
    traceId: context?.traceId,
  };
};

export const createAuditLogWithClient = async (
  client: AuditClient,
  input: CreateAuditLogInput,
): Promise<void> => {
  await client.auditLog.create({
    data: buildAuditLogData(input),
  });
};

export const createAuditLog = async (input: CreateAuditLogInput): Promise<void> => {
  await createAuditLogWithClient(prisma, input);
};
