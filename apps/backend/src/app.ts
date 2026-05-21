import cors from 'cors';
import express from 'express';

import { env } from './config/env.js';
import { errorHandler } from './errors/errorHandler.js';
import { authRouter } from './auth/authRoutes.js';
import { bookingRequestsRouter } from './bookingRequests/bookingRequests.routes.js';
import { healthRouter } from './routes/healthRoutes.js';
import { lessonsRouter } from './lessons/lessons.routes.js';
import { matchingRouter } from './matching/matching.routes.js';
import { studentIntakesRouter } from './studentIntakes/studentIntakes.routes.js';
import { teacherRouter } from './teachers/teacherRoutes.js';
import { teacherAvailabilityRouter } from './teacherAvailability/teacherAvailability.routes.js';
import { teacherSchedulingPreferencesRouter } from './teacherSchedulingPreferences/teacherSchedulingPreferences.routes.js';

export function createApp() {
  const app = express();

  app.use(cors({
    origin: env.FRONTEND_ORIGIN,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Provider-Token'],
  }));
  app.use(express.json());

  app.use('/auth', authRouter);
  app.use('/health', healthRouter);
  app.use('/api/booking-requests', bookingRequestsRouter);
  app.use('/api/lessons', lessonsRouter);
  app.use('/api/matching', matchingRouter);
  app.use('/api/student-intakes', studentIntakesRouter);
  app.use('/api/teachers', teacherRouter);
  app.use('/api/teacher-availability', teacherAvailabilityRouter);
  app.use('/api/teacher-scheduling-preferences', teacherSchedulingPreferencesRouter);

  app.use(errorHandler);

  return app;
}
