import type { ErrorRequestHandler } from 'express';

import { AppError } from './AppError.js';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  response.status(500).json({ error: 'Unexpected server error' });
};
