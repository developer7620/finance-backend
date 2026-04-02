import { env } from '../config/env';

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Finance Dashboard Backend API',
    version: '1.1.0',
    description:
      'Finance dashboard backend with JWT auth, refresh-token rotation, RBAC, audit logs, observability endpoints, and Prisma-backed analytics.',
  },
  servers: [
    {
      url: `http://localhost:${env.PORT}`,
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            const: false,
          },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
            },
            required: ['code', 'message'],
          },
        },
        required: ['success', 'error'],
      },
      Tokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          refreshTokenExpiresAt: { type: 'string', format: 'date-time' },
        },
        required: ['accessToken', 'refreshToken', 'refreshTokenExpiresAt'],
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: {
            type: 'string',
            enum: ['VIEWER', 'ANALYST', 'ADMIN'],
          },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'email', 'name', 'role', 'isActive', 'createdAt', 'updatedAt'],
      },
      Record: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          amount: { type: 'string' },
          type: {
            type: 'string',
            enum: ['INCOME', 'EXPENSE'],
          },
          category: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
          notes: { type: ['string', 'null'] },
          createdById: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: [
          'id',
          'amount',
          'type',
          'category',
          'date',
          'createdById',
          'createdAt',
          'updatedAt',
        ],
      },
    },
  },
  paths: {
    '/api/auth/register': {
      post: {
        summary: 'Register a new viewer account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
                required: ['name', 'email', 'password'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Viewer account created',
          },
          '400': {
            description: 'Validation error',
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Login with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authenticated successfully',
          },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        summary: 'Rotate refresh token and issue a new access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string' },
                },
                required: ['refreshToken'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Tokens rotated successfully',
          },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        summary: 'Revoke a refresh token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string' },
                },
                required: ['refreshToken'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Session revoked',
          },
        },
      },
    },
    '/api/auth/logout-all': {
      post: {
        summary: 'Revoke all refresh tokens for the authenticated user',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'All sessions revoked',
          },
        },
      },
    },
    '/api/auth/me': {
      get: {
        summary: 'Get current authenticated user',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current user',
          },
        },
      },
    },
    '/api/users': {
      get: {
        summary: 'List users',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Paginated users',
          },
        },
      },
    },
    '/api/users/{id}': {
      get: {
        summary: 'Get a user by id',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'User found',
          },
        },
      },
      patch: {
        summary: 'Update a user',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'User updated',
          },
        },
      },
    },
    '/api/users/{id}/deactivate': {
      patch: {
        summary: 'Deactivate a user',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'User deactivated',
          },
        },
      },
    },
    '/api/records': {
      post: {
        summary: 'Create a record',
        security: [{ bearerAuth: [] }],
        responses: {
          '201': {
            description: 'Record created',
          },
        },
      },
      get: {
        summary: 'List records with filters',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Paginated records',
          },
        },
      },
    },
    '/api/records/{id}': {
      get: {
        summary: 'Get a single record',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Record found',
          },
        },
      },
      patch: {
        summary: 'Update a record',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Record updated',
          },
        },
      },
      delete: {
        summary: 'Soft delete a record',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Record deleted',
          },
        },
      },
    },
    '/api/dashboard/summary': {
      get: {
        summary: 'Get dashboard summary',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Summary metrics',
          },
        },
      },
    },
    '/api/dashboard/by-category': {
      get: {
        summary: 'Get totals by category',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Category totals',
          },
        },
      },
    },
    '/api/dashboard/trends': {
      get: {
        summary: 'Get monthly trends for the last 12 months',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Monthly income and expense trends',
          },
        },
      },
    },
    '/api/dashboard/recent': {
      get: {
        summary: 'Get the most recent transactions',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Recent transactions',
          },
        },
      },
    },
    '/health': {
      get: {
        summary: 'Combined health check',
        responses: {
          '200': {
            description: 'Service health',
          },
        },
      },
    },
    '/health/live': {
      get: {
        summary: 'Liveness probe',
        responses: {
          '200': {
            description: 'Service is alive',
          },
        },
      },
    },
    '/health/ready': {
      get: {
        summary: 'Readiness probe',
        responses: {
          '200': {
            description: 'Service is ready',
          },
        },
      },
    },
    '/metrics': {
      get: {
        summary: 'Prometheus metrics',
        responses: {
          '200': {
            description: 'Metrics exposition format',
          },
        },
      },
    },
    '/openapi.json': {
      get: {
        summary: 'OpenAPI specification',
        responses: {
          '200': {
            description: 'OpenAPI document',
          },
        },
      },
    },
  },
} as const;
