import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';

export interface RequestContextValue {
  requestId: string;
  traceId: string;
  ipAddress?: string;
  userAgent?: string;
}

const requestContextStorage = new AsyncLocalStorage<RequestContextValue>();

export const getRequestContext = (): RequestContextValue | undefined => requestContextStorage.getStore();

export const requestContext: RequestHandler = (req, res, next) => {
  const requestId = req.headers['x-request-id']?.toString() || randomUUID();
  const traceId = req.headers['x-trace-id']?.toString() || requestId;
  const ipAddress = req.ip || req.socket.remoteAddress || undefined;
  const userAgent = req.get('user-agent') || undefined;

  req.requestId = requestId;
  req.traceId = traceId;

  res.setHeader('x-request-id', requestId);
  res.setHeader('x-trace-id', traceId);

  requestContextStorage.run(
    {
      requestId,
      traceId,
      ipAddress,
      userAgent,
    },
    next,
  );
};
