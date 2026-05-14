import type { NextFunction, Request, Response } from 'express';

export function requireAuth(_request: Request, response: Response, _next: NextFunction) {
  response.status(501).json({ error: 'Authentication middleware is not configured yet' });
}
