import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

// Keep-alive: the free Render tier sleeps after ~15min idle and cold-starts in
// 30–60s, which makes the first requests time out / hang. Self-ping our own
// /health every 10 minutes to stay warm for the demo. It's a plain GET to a
// static handler — no business logic, no DB, no mutation. Runs only when a public
// base URL is known (RENDER_EXTERNAL_URL on Render, or an explicit KEEP_ALIVE_URL)
// and never under tests. The timer is unref'd so it never blocks shutdown.
function startKeepAlive(): void {
  const baseUrl = env.KEEP_ALIVE_URL ?? env.RENDER_EXTERNAL_URL;
  if (!baseUrl || env.NODE_ENV === 'test') return;

  const target = `${baseUrl.replace(/\/+$/, '')}/health`;
  const intervalMs = 10 * 60 * 1000; // < Render's ~15min idle window

  const timer = setInterval(() => {
    // Best-effort: never throw, never crash the process on a transient failure.
    fetch(target).catch(() => {});
  }, intervalMs);
  timer.unref();

  console.log(`Keep-alive enabled: GET ${target} every ${intervalMs / 60000}m`);
}

const server = app.listen(env.PORT, env.HOST, () => {
  console.log(`StudyBuddy backend listening at http://${env.HOST}:${env.PORT}`);
  console.log(`Allowed frontend origin: ${env.FRONTEND_ORIGIN}`);
  startKeepAlive();
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
