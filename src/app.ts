import express, { type NextFunction, type Request, type Response } from 'express';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import swaggerUi from 'swagger-ui-express';
import { ZodError } from 'zod';

import authRoutes from './modules/auth/auth.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import observabilityRoutes from './modules/observability/observability.routes';
import recordsRoutes from './modules/records/records.routes';
import usersRoutes from './modules/users/users.routes';
import { logger } from './config/logger';
import { openApiDocument } from './docs/openapi';
import { metricsMiddleware } from './observability/metrics';
import { requestContext } from './middleware/requestContext';
import { requestLogging } from './middleware/requestLogging';
import { ApiError } from './utils/ApiError';

const app = express();

const formatValidationMessage = (error: ZodError): string => {
  const message = error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'request';
      return `${path}: ${issue.message}`;
    })
    .join('; ');

  return message || 'Request validation failed.';
};

const isBodyParserSyntaxError = (error: unknown): error is SyntaxError & { body: unknown } => {
  return error instanceof SyntaxError && 'body' in error;
};

app.disable('x-powered-by');
app.use(requestContext);
app.use(metricsMiddleware);
app.use(requestLogging);
app.use(express.json());

app.use(observabilityRoutes);
app.get('/openapi.json', (_req: Request, res: Response) => {
  res.status(200).json(openApiDocument);
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new ApiError(404, 'ROUTE_NOT_FOUND', 'Route not found.'));
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ApiError && error.statusCode < 500) {
    logger.warn(
      {
        requestId: _req.requestId,
        traceId: _req.traceId,
        code: error.code,
        statusCode: error.statusCode,
        message: error.message,
      },
      'request.failed',
    );
  }

  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  if (error instanceof ZodError) {
    logger.warn(
      {
        requestId: _req.requestId,
        traceId: _req.traceId,
        issues: error.issues,
      },
      'request.validation_failed',
    );

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: formatValidationMessage(error),
      },
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = Array.isArray(error.meta?.['target']) ? error.meta['target'].join(', ') : 'resource';

      return res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: `${target} must be unique.`,
        },
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Requested resource was not found.',
        },
      });
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    logger.warn(
      {
        requestId: _req.requestId,
        traceId: _req.traceId,
      },
      'request.database_validation_failed',
    );

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Database query validation failed.',
      },
    });
  }

  if (error instanceof jwt.TokenExpiredError) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access token has expired.',
      },
    });
  }

  if (error instanceof jwt.JsonWebTokenError) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid access token.',
      },
    });
  }

  if (isBodyParserSyntaxError(error)) {
    logger.warn(
      {
        requestId: _req.requestId,
        traceId: _req.traceId,
      },
      'request.invalid_json',
    );

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request body contains invalid JSON.',
      },
    });
  }

  logger.error(
    {
      requestId: _req.requestId,
      traceId: _req.traceId,
      error,
    },
    'request.unhandled_error',
  );

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    },
  });
});

export default app;
