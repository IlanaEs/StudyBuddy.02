import cors from 'cors';
import express from 'express';

import { env } from './config/env.js';
import { errorHandler } from './errors/errorHandler.js';
import { authRouter } from './auth/authRoutes.js';
import { healthRouter } from './routes/healthRoutes.js';
import { teacherAvailabilityRouter } from './teacherAvailability/teacherAvailability.routes.js';
import { teacherSchedulingPreferencesRouter } from './teacherSchedulingPreferences/teacherSchedulingPreferences.routes.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.FRONTEND_ORIGIN }));
  app.use(express.json());

  app.use('/auth', authRouter);
  app.use('/health', healthRouter);
  app.use('/api/teacher-availability', teacherAvailabilityRouter);
  app.use('/api/teacher-scheduling-preferences', teacherSchedulingPreferencesRouter);

  app.use(errorHandler);

  return app;
}
