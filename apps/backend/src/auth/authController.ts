import type { Request, Response } from 'express';

import { login, logout, signup } from './authService.js';

export async function signupController(request: Request, response: Response) {
  const result = await signup(request.body);

  response.status(201).json({ data: result });
}

export async function loginController(request: Request, response: Response) {
  const result = await login(request.body);

  response.status(200).json({ data: result });
}

export async function logoutController(request: Request, response: Response) {
  const result = await logout(request.auth?.access_token ?? '');

  response.status(200).json({ data: result });
}

export function meController(request: Request, response: Response) {
  response.status(200).json({
    data: {
      user: request.auth?.user,
    },
  });
}
