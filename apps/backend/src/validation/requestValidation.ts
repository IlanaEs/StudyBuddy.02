import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

import { AppError } from '../errors/AppError.js';

export function validateRequest(schema: ZodSchema) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: request.body,
      params: request.params,
      query: request.query,
    });

    if (!result.success) {
      next(new AppError('Request validation failed', 422));
      return undefined;
    }

    request.body = result.data.body ?? request.body;
    request.params = result.data.params ?? request.params;
    request.query = result.data.query ?? request.query;

    return next();
  };
}
