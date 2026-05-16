import cors from 'cors';
import express from 'express';

import { env } from './config/env.js';
import { errorHandler } from './errors/errorHandler.js';
import { authRouter } from './auth/authRoutes.js';
import { healthRouter } from './routes/healthRoutes.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.FRONTEND_ORIGIN }));
  app.use(express.json());

  app.use('/auth', authRouter);
  app.use('/health', healthRouter);

  app.use(errorHandler);

  return app;
}
