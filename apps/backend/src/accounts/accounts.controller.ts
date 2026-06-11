import type { Request, Response } from 'express';

import { createAccountForUser } from './accounts.service.js';

// POST /api/accounts — create an additional account (role) for the current identity.
export async function createAccountController(request: Request, response: Response) {
  const account = await createAccountForUser(request.auth!.user, request.body.role);
  response.status(201).json({ data: account });
}
