import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

import { AppError } from '../errors/AppError.js';
import { env } from '../config/env.js';

export function validateRequest(schema: ZodSchema) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: request.body,
      params: request.params,
      query: request.query,
    });

    if (!result.success) {
      // Dev-only diagnostic: surface exactly which field(s) failed so 422s are
      // debuggable. The client still receives only the generic message.
      if (env.NODE_ENV !== 'production') {
        console.warn(
          `[validateRequest] ${request.method} ${request.originalUrl} failed:\n` +
            JSON.stringify(result.error.issues, null, 2),
        );
      }
      next(new AppError('Request validation failed', 422));
      return undefined;
    }

    request.body = result.data.body ?? request.body;
    request.params = result.data.params ?? request.params;
    request.query = result.data.query ?? request.query;

    return next();
  };
}
