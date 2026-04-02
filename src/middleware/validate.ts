import type { Request, RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

interface ValidationSchema {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export const validate = (schema: ValidationSchema): RequestHandler => {
  return (req, _res, next) => {
    try {
      const mutableRequest = req as Request & {
        body: unknown;
        params: unknown;
        query: unknown;
      };

      if (schema.body) {
        mutableRequest.body = schema.body.parse(req.body);
      }

      if (schema.params) {
        mutableRequest.params = schema.params.parse(req.params);
      }

      if (schema.query) {
        mutableRequest.query = schema.query.parse(req.query);
      }

      next();
    } catch (error: unknown) {
      next(error);
    }
  };
};
