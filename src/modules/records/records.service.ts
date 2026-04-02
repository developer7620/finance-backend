import { AuditAction, AuditEntityType, Prisma, Role } from '@prisma/client';

import type { RequestUser } from '../../types/express';
import { ApiError } from '../../utils/ApiError';
import type { PaginationMeta } from '../../utils/ApiResponse';
import { createAuditLogWithClient } from '../audit/audit.service';
import type {
  CreateRecordBody,
  ListRecordsQuery,
  UpdateRecordBody,
} from '../../validators/records.validator';
import { prisma } from '../../config/prisma';

const creatorSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
} as const satisfies Prisma.UserSelect;

const recordSelect = {
  id: true,
  amount: true,
  type: true,
  category: true,
  date: true,
  notes: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: creatorSelect,
  },
} as const satisfies Prisma.RecordSelect;

type RecordWithCreator = Prisma.RecordGetPayload<{
  select: typeof recordSelect;
}>;

const normalizeCategory = (category: string): string => category.trim().toLowerCase();

const serializeDecimal = (value: Prisma.Decimal): string => value.toFixed(2);

const serializeRecord = (record: RecordWithCreator) => ({
  id: record.id,
  amount: serializeDecimal(record.amount),
  type: record.type,
  category: record.category,
  date: record.date,
  notes: record.notes,
  createdById: record.createdById,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  createdBy: {
    id: record.createdBy.id,
    email: record.createdBy.email,
    name: record.createdBy.name,
    role: record.createdBy.role,
  },
});

const buildPaginationMeta = (page: number, limit: number, total: number): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});

const toBoundaryDate = (value: string, boundary: 'start' | 'end'): Date => {
  if (value.includes('T')) {
    return new Date(value);
  }

  return new Date(
    `${value}${boundary === 'start' ? 'T00:00:00.000Z' : 'T23:59:59.999Z'}`,
  );
};

const buildWhereClause = (query: ListRecordsQuery, user: RequestUser): Prisma.RecordWhereInput => {
  const where: Prisma.RecordWhereInput = {
    deletedAt: null,
  };

  if (user.role === Role.VIEWER) {
    where.createdById = user.id;
  }

  if (query.type) {
    where.type = query.type;
  }

  if (query.category) {
    where.category = normalizeCategory(query.category);
  }

  if (query.dateFrom || query.dateTo) {
    where.date = {};

    if (query.dateFrom) {
      where.date.gte = toBoundaryDate(query.dateFrom, 'start');
    }

    if (query.dateTo) {
      where.date.lte = toBoundaryDate(query.dateTo, 'end');
    }
  }

  return where;
};

export const createRecord = async (input: CreateRecordBody, createdById: string) => {
  return prisma.$transaction(async (client) => {
    const record = await client.record.create({
      data: {
        amount: input.amount,
        type: input.type,
        category: normalizeCategory(input.category),
        date: new Date(input.date),
        notes: input.notes?.trim(),
        createdById,
      },
      select: recordSelect,
    });

    await createAuditLogWithClient(client, {
      action: AuditAction.RECORD_CREATE,
      entityType: AuditEntityType.RECORD,
      entityId: record.id,
      actorId: createdById,
      metadata: {
        type: record.type,
        category: record.category,
        amount: serializeDecimal(record.amount),
      },
    });

    return serializeRecord(record);
  });
};

export const listRecords = async (query: ListRecordsQuery, user: RequestUser) => {
  const skip = (query.page - 1) * query.limit;
  const where = buildWhereClause(query, user);
  const orderBy = {
    [query.sortBy]: query.sortOrder,
  } as Prisma.RecordOrderByWithRelationInput;

  const [records, total] = await prisma.$transaction([
    prisma.record.findMany({
      where,
      skip,
      take: query.limit,
      orderBy,
      select: recordSelect,
    }),
    prisma.record.count({ where }),
  ]);

  return {
    records: records.map(serializeRecord),
    meta: buildPaginationMeta(query.page, query.limit, total),
  };
};

export const getRecordById = async (id: string, user: RequestUser) => {
  const record = await prisma.record.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    select: recordSelect,
  });

  if (!record) {
    throw new ApiError(404, 'NOT_FOUND', 'Record not found.');
  }

  if (user.role !== Role.ADMIN && record.createdById !== user.id) {
    throw new ApiError(403, 'FORBIDDEN', 'You do not have access to this record.');
  }

  return serializeRecord(record);
};

export const updateRecordById = async (id: string, input: UpdateRecordBody, actorId: string) => {
  const existingRecord = await prisma.record.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!existingRecord) {
    throw new ApiError(404, 'NOT_FOUND', 'Record not found.');
  }

  const data: Prisma.RecordUpdateInput = {};

  if (input.amount !== undefined) {
    data.amount = input.amount;
  }

  if (input.type !== undefined) {
    data.type = input.type;
  }

  if (input.category !== undefined) {
    data.category = normalizeCategory(input.category);
  }

  if (input.date !== undefined) {
    data.date = new Date(input.date);
  }

  if (input.notes !== undefined) {
    data.notes = input.notes === null ? null : input.notes.trim();
  }

  return prisma.$transaction(async (client) => {
    const updatedRecord = await client.record.update({
      where: { id },
      data,
      select: recordSelect,
    });

    await createAuditLogWithClient(client, {
      action: AuditAction.RECORD_UPDATE,
      entityType: AuditEntityType.RECORD,
      entityId: updatedRecord.id,
      actorId,
      metadata: {
        updatedFields: Object.keys(input),
      },
    });

    return serializeRecord(updatedRecord);
  });
};

export const softDeleteRecordById = async (id: string, actorId: string) => {
  const existingRecord = await prisma.record.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!existingRecord) {
    throw new ApiError(404, 'NOT_FOUND', 'Record not found.');
  }

  const deletedAt = new Date();

  return prisma.$transaction(async (client) => {
    await client.record.update({
      where: { id },
      data: {
        deletedAt,
      },
    });

    await createAuditLogWithClient(client, {
      action: AuditAction.RECORD_DELETE,
      entityType: AuditEntityType.RECORD,
      entityId: id,
      actorId,
    });

    return {
      id,
      deletedAt: deletedAt.toISOString(),
    };
  });
};
