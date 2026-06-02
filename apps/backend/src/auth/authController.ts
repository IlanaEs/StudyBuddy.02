import type { Request, Response } from 'express';

import { AppError } from '../errors/AppError.js';
import { completeOAuthSignup, logout } from './authService.js';
import { getProfileForUser } from './authRepository.js';

function bearerToken(request: Request): string {
  const header = request.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('Missing authentication token', 401);
  }
  return header.slice('Bearer '.length).trim();
}

export async function logoutController(request: Request, response: Response) {
  const result = await logout(request.auth?.access_token ?? '');

  response.status(200).json({ data: result });
}

export async function completeOAuthSignupController(request: Request, response: Response) {
  // This route runs WITHOUT requireAuth (it provisions an as-yet-unprovisioned
  // user), so read the bearer token directly; completeOAuthSignup authenticates
  // it via getUser before assigning the role.
  const result = await completeOAuthSignup(bearerToken(request), request.body);
  response.status(200).json({ data: result });
}

export async function meController(request: Request, response: Response) {
  const user = request.auth!.user;
  const profile = await getProfileForUser(user.id, user.role);

  response.status(200).json({
    data: { user, profile },
  });
}
