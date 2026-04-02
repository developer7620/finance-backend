import type { RequestHandler } from 'express';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const metricsRegistry = new Registry();

collectDefaultMetrics({
  register: metricsRegistry,
  prefix: 'finance_backend_',
});

const httpRequestsTotal = new Counter({
  name: 'finance_backend_http_requests_total',
  help: 'Total number of HTTP requests handled by the service.',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [metricsRegistry],
});

const httpRequestDurationMs = new Histogram({
  name: 'finance_backend_http_request_duration_ms',
  help: 'HTTP request duration in milliseconds.',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [25, 50, 100, 250, 500, 1_000, 2_000, 5_000],
  registers: [metricsRegistry],
});

export const metricsMiddleware: RequestHandler = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path;
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDurationMs.observe(labels, durationMs);
  });

  next();
};
