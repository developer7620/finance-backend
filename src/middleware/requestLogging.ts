import type { RequestHandler } from 'express';

import { logger } from '../config/logger';
import { getRequestContext } from './requestContext';

export const requestLogging: RequestHandler = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const context = getRequestContext();
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    logger.info(
      {
        requestId: context?.requestId,
        traceId: context?.traceId,
        method: req.method,
        path: req.originalUrl,
        route: req.route?.path ? `${req.baseUrl}${req.route.path}` : undefined,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        userId: req.user?.id,
        ipAddress: context?.ipAddress,
      },
      'request.completed',
    );
  });

  next();
};
