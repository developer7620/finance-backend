# Finance Dashboard Backend

A clean backend system demonstrating:

- permission-based RBAC
- financial data modeling
- database-level aggregation queries
- validation and structured error handling

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm 10+

## Setup

1. Clone or open the project directory.
2. Move into the backend folder:
   ```bash
   cd finance-backend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create an environment file:
   ```bash
   cp .env.example .env
   ```
5. Start PostgreSQL. If you want the included Docker setup, you can run:
   ```bash
   npm run docker:up
   ```
6. Update `.env` with a valid PostgreSQL connection string and a strong JWT secret if you are not using the default local setup.
7. Generate the Prisma client:
   ```bash
   npx prisma generate
   ```
8. Run the migrations:
   ```bash
   npx prisma migrate dev --name init
   ```
9. Seed the database:
   ```bash
   npx prisma db seed
   ```
10. Start the development server:
   ```bash
   npm run dev
   ```

## Optional Verification

If you want to run the integration suite locally:

1. Ensure PostgreSQL is running on `localhost:5433`.
2. Reset the test database:
   ```bash
   npm run test:db:reset
   ```
3. Run the integration suite:
   ```bash
   npm run test:integration
   ```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | No | Runtime mode. Supported values: `development`, `test`, `production`. Defaults to `development`. |
| `PORT` | No | HTTP server port. Defaults to `4000`. |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma. |
| `JWT_SECRET` | Yes | Secret used to sign and verify JWT access tokens. Must be at least 32 characters. |
| `JWT_EXPIRES_IN` | Yes | JWT access-token TTL passed directly to `jsonwebtoken`, for example `1d` or `12h`. |
| `LOG_LEVEL` | No | Structured logging level. Defaults to `info`. |

## Seed Credentials

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@finance.dev` | `Admin@1234` |
| Analyst | `analyst@finance.dev` | `Analyst@1234` |
| Viewer | `viewer@finance.dev` | `Viewer@1234` |

## API Endpoints

| Method | Path | Auth | Permission |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | None |
| `POST` | `/api/auth/login` | Public | None, rate limited to 10 requests per 15 minutes |
| `GET` | `/api/auth/me` | Bearer token | Authenticated user |
| `GET` | `/api/users` | Bearer token | `users:read` |
| `GET` | `/api/users/:id` | Bearer token | `users:read` |
| `PATCH` | `/api/users/:id` | Bearer token | `users:update` |
| `PATCH` | `/api/users/:id/deactivate` | Bearer token | `users:deactivate` |
| `POST` | `/api/records` | Bearer token | `records:create` |
| `GET` | `/api/records` | Bearer token | `records:read:own` or `records:read:all` |
| `GET` | `/api/records/:id` | Bearer token | `records:read:own` or `records:read:all`, with service-layer ownership enforcement |
| `PATCH` | `/api/records/:id` | Bearer token | `records:update` |
| `DELETE` | `/api/records/:id` | Bearer token | `records:delete` |
| `GET` | `/api/dashboard/summary` | Bearer token | `dashboard:read` |
| `GET` | `/api/dashboard/by-category` | Bearer token | `dashboard:read` |
| `GET` | `/api/dashboard/trends` | Bearer token | `dashboard:read` |
| `GET` | `/api/dashboard/recent` | Bearer token | `dashboard:read` |

## RBAC

| Role | Permissions |
| --- | --- |
| `VIEWER` | `records:read:own`, `dashboard:read` |
| `ANALYST` | `records:read:all`, `dashboard:read` |
| `ADMIN` | `records:read:all`, `records:create`, `records:update`, `records:delete`, `users:read`, `users:create`, `users:update`, `users:deactivate`, `dashboard:read` |

## Records Query Parameters

`GET /api/records` supports:

| Parameter | Type | Notes |
| --- | --- | --- |
| `type` | `INCOME \| EXPENSE` | Optional record type filter |
| `category` | `string` | Optional category filter, normalized in the service layer |
| `dateFrom` | ISO string | Inclusive lower date boundary |
| `dateTo` | ISO string | Inclusive upper date boundary |
| `page` | `number` | Defaults to `1` |
| `limit` | `number` | Defaults to `10`, max `100` |
| `sortBy` | `date \| amount \| createdAt` | Whitelisted sort field |
| `sortOrder` | `asc \| desc` | Defaults to `desc` |

## Response Format

Successful responses:

```json
{
  "success": true,
  "data": {}
}
```

Paginated responses:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "email: Email must be a valid email address."
  }
}
```

## Design Decisions

- Prisma is used for type-safe schema management, client generation, transactions, and ergonomic data access.
- Soft delete on records preserves auditability while keeping deleted transactions out of operational dashboards and listings.
- Zod validates environment variables at startup so configuration problems fail fast before the server accepts traffic.
- Zod request validation sits at the middleware layer, keeping controllers thin and pushing business rules into services.
- A centralized permission map keeps RBAC logic declarative and avoids scattering role checks across routes.
- Dashboard aggregations run in PostgreSQL through `prisma.$queryRaw`, which keeps heavy grouping and monthly trend logic in the database.
- Decimal values are always serialized to strings before leaving the service layer to avoid precision loss in JSON consumers.

## Tradeoffs

- Express was used instead of a heavier framework such as NestJS to keep the architecture explicit and easy to review.
- Raw SQL is limited to dashboard aggregations where PostgreSQL features like `DATE_TRUNC` and grouped totals are the clearest fit.
- Soft delete was chosen over hard delete because financial records are typically safer to hide than permanently remove.
- Caching was intentionally omitted because the expected scale for this assignment does not justify extra moving parts.

## Assumptions

- RBAC follows the provided brief: `VIEWER` can read only their own records, `ANALYST` has read access aligned to the central permission map, and `ADMIN` has full write and user-management access.
- Public registration is intentionally limited to creating `VIEWER` accounts; higher-privilege users come from seed data or future admin-managed onboarding.
- Soft delete is used for records instead of hard delete so historical entries remain recoverable while staying excluded from normal listings and dashboard queries.
- Dashboard queries are optimized at the database layer and always exclude soft-deleted records.
- The local development defaults assume PostgreSQL is reachable on `localhost:5433` when using the included Docker setup.

## What I Would Add With More Time

- Automated integration coverage around the most critical business paths: auth, RBAC, record filtering, and dashboard aggregations.
- A small request collection with example payloads for faster manual evaluation.
- Optional audit-history browsing for admins if the product required deeper operational traceability.
