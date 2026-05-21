import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/AppError.js';
import { verifyAccessToken } from '../auth/authService.js';
import type { UserRole } from '../auth/authTypes.js';

function extractBearerToken(header?: string) {
  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length).trim();
}

export async function requireAuth(request: Request, _response: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(request.header('authorization'));

    if (!token) {
      throw new AppError('Missing authentication token', 401);
    }

    request.auth = await verifyAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(role: UserRole) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (request.auth?.user.role !== role) {
      next(new AppError('Forbidden', 403));
      return;
    }
    next();
  };
}

export function requireAnyRole(roles: UserRole[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.auth || !roles.includes(request.auth.user.role)) {
      next(new AppError('Forbidden', 403));
      return;
    }
    next();
  };
}
