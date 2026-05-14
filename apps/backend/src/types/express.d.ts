import type { AuthenticatedRequestContext } from '../auth/authTypes.js';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedRequestContext;
    }
  }
}

export {};
