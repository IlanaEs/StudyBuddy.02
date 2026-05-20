import cors from 'cors';
import express from 'express';

import { env } from './config/env.js';
import { errorHandler } from './errors/errorHandler.js';
import { authRouter } from './auth/authRoutes.js';
import { healthRouter } from './routes/healthRoutes.js';
import { matchingRouter } from './matching/matching.routes.js';
import { studentIntakesRouter } from './studentIntakes/studentIntakes.routes.js';
import { teacherRouter } from './teachers/teacherRoutes.js';

export function createApp() {
  const app = express();

  app.use(cors({
    origin: env.FRONTEND_ORIGIN,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Provider-Token'],
  }));
  app.use(express.json());

  app.use('/auth', authRouter);
  app.use('/health', healthRouter);
  app.use('/api/matching', matchingRouter);
  app.use('/api/student-intakes', studentIntakesRouter);
  app.use('/api/teachers', teacherRouter);

  app.use(errorHandler);

  return app;
}
