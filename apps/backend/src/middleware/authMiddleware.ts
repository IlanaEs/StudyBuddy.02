import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/AppError.js';
import { verifyAccessToken } from '../auth/authService.js';
import type { UserRole } from '../auth/authTypes.js';
import { adminQaModeEnabled } from '../config/env.js';

const ADMIN_QA_EMAILS = new Set(['i26082001@gmail.com']);
const VALID_QA_ROLES = new Set<string>(['teacher', 'parent']);

function extractBearerToken(header?: string) {
  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length).trim();
}

function resolveEffectiveRole(request: Request): UserRole | undefined {
  const auth = request.auth;
  if (!auth) return undefined;

  if (adminQaModeEnabled) {
    const isAdmin = auth.user.role === 'admin' || ADMIN_QA_EMAILS.has(auth.user.email);
    if (isAdmin) {
      const qaHeader = request.header('x-admin-qa-role');
      if (qaHeader && VALID_QA_ROLES.has(qaHeader)) {
        return qaHeader as UserRole;
      }
    }
  }

  return auth.user.role;
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
    if (resolveEffectiveRole(request) !== role) {
      next(new AppError('Forbidden', 403));
      return;
    }
    next();
  };
}

export function requireAnyRole(roles: UserRole[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const effectiveRole = resolveEffectiveRole(request);
    if (!effectiveRole || !roles.includes(effectiveRole)) {
      next(new AppError('Forbidden', 403));
      return;
    }
    next();
  };
}
