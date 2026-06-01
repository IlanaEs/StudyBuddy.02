import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

const server = app.listen(env.PORT, env.HOST, () => {
  console.log(`StudyBuddy backend listening at http://${env.HOST}:${env.PORT}`);
  console.log(`Allowed frontend origin: ${env.FRONTEND_ORIGIN}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`StudyBuddy backend failed to start: ${env.HOST}:${env.PORT} is already in use.`);
    process.exit(1);
  }
  if (error.code === 'EACCES' || error.code === 'EPERM') {
    console.error(`StudyBuddy backend failed to start: permission denied while binding ${env.HOST}:${env.PORT}.`);
    process.exit(1);
  }
  throw error;
});
