import cors from 'cors';
import express from 'express';

import { academicRepositoriesRouter } from './academicRepositories/academicRepositories.routes.js';
import { allowedOrigins } from './config/env.js';
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
import { teacherAvailabilityExceptionsRouter } from './teacherAvailabilityExceptions/teacherAvailabilityExceptions.routes.js';
import { teacherOnboardingRouter } from './teacherOnboarding/teacherOnboarding.routes.js';
import { studentsRouter } from './students/students.routes.js';
import { studentAvailabilityRouter } from './studentAvailability/studentAvailability.routes.js';
import { parentDashboardRouter } from './parentDashboard/parentDashboard.routes.js';
import { studentDashboardRouter } from './studentDashboard/studentDashboard.routes.js';

export function createApp() {
  const app = express();

  app.use(cors({
    origin(origin, callback) {
      // Allow requests with no Origin header (e.g. server-to-server, curl, health checks)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Provider-Token', 'X-Admin-QA-Role'],
  }));
  app.use(express.json());

  app.use('/api/auth', authRouter);
  app.use('/api', academicRepositoriesRouter);
  app.use('/health', healthRouter);
  app.use('/api/health', healthRouter);
  app.use('/api/booking-requests', bookingRequestsRouter);
  app.use('/api/lessons', lessonsRouter);
  app.use('/api/matching', matchingRouter);
  app.use('/api/student-intakes', studentIntakesRouter);
  app.use('/api/teachers', teacherOnboardingRouter);
  app.use('/api/teachers', teacherRouter);
  app.use('/api/teacher-availability', teacherAvailabilityRouter);
  app.use('/api/teacher-scheduling-preferences', teacherSchedulingPreferencesRouter);
  app.use('/api/teacher-availability-exceptions', teacherAvailabilityExceptionsRouter);
  app.use('/api/students/me', studentDashboardRouter);
  app.use('/api/students', studentsRouter);
  app.use('/api/student-availability', studentAvailabilityRouter);
  app.use('/api/parents/me', parentDashboardRouter);

  app.use(errorHandler);

  return app;
}
