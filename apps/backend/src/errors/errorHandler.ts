import type { ErrorRequestHandler } from 'express';

import { AppError } from './AppError.js';

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  if (error instanceof AppError) {
    // Surface server-side failures in the log (5xx). The client still receives
    // only the safe message; the real cause is never swallowed silently.
    if (error.statusCode >= 500) {
      console.error(`[AppError ${error.statusCode}] ${request.method} ${request.originalUrl} —`, error.message);
    }
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error(`[UnhandledError] ${request.method} ${request.originalUrl} —`, error);
  response.status(500).json({ error: 'Unexpected server error' });
};
