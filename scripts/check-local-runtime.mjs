const checks = [
  { name: 'backend /api/health', url: process.env.BACKEND_HEALTH_URL ?? 'http://127.0.0.1:4000/api/health' },
  { name: 'frontend', url: process.env.FRONTEND_URL ?? 'http://127.0.0.1:3001/' },
];

for (const check of checks) {
  try {
    const response = await fetch(check.url, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    console.log(`${check.name}: ok (${check.url})`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error(`${check.name}: failed (${check.url}) - ${message}`);
    process.exitCode = 1;
  }
}
