import cors from 'cors';
import express from 'express';

import { env } from './config/env.js';
import { errorHandler } from './errors/errorHandler.js';
import { authRouter } from './auth/authRoutes.js';
import { healthRouter } from './routes/healthRoutes.js';
import { teacherAvailabilityRouter } from './teacherAvailability/teacherAvailability.routes.js';
import { teacherSchedulingPreferencesRouter } from './teacherSchedulingPreferences/teacherSchedulingPreferences.routes.js';
import { teacherAvailabilityExceptionsRouter } from './teacherAvailabilityExceptions/teacherAvailabilityExceptions.routes.js';
import { teacherOnboardingRouter } from './teacherOnboarding/teacherOnboarding.routes.js';
import { teacherCalendarRouter } from './teacherCalendar/teacherCalendar.routes.js';
import { studentsRouter } from './students/students.routes.js';
import { studentIntakesRouter } from './studentIntakes/studentIntakes.routes.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.FRONTEND_ORIGIN }));
  app.use(express.json());

  app.use('/auth', authRouter);
  app.use('/health', healthRouter);
  app.use('/api/teacher-availability', teacherAvailabilityRouter);
  app.use('/api/teacher-scheduling-preferences', teacherSchedulingPreferencesRouter);
  app.use('/api/teacher-availability-exceptions', teacherAvailabilityExceptionsRouter);
  // Calendar router first: its public /me/calendar/callback must be matched
  // before the onboarding router's global requireAuth would reject it (401).
  app.use('/api/teachers', teacherCalendarRouter);
  app.use('/api/teachers', teacherOnboardingRouter);
  app.use('/api/students', studentsRouter);
  app.use('/api/student-intakes', studentIntakesRouter);

  app.use(errorHandler);

  return app;
}
