import type { Request, Response } from 'express';

import { completeOAuthSignup, logout } from './authService.js';
import { getProfileForUser } from './authRepository.js';

export async function logoutController(request: Request, response: Response) {
  const result = await logout(request.auth?.access_token ?? '');

  response.status(200).json({ data: result });
}

export async function completeOAuthSignupController(request: Request, response: Response) {
  const accessToken = request.auth?.access_token ?? '';
  const result = await completeOAuthSignup(accessToken, request.body);
  response.status(200).json({ data: result });
}

export async function meController(request: Request, response: Response) {
  const user = request.auth!.user;
  const profile = await getProfileForUser(user.id, user.role);

  response.status(200).json({
    data: { user, profile },
  });
}
