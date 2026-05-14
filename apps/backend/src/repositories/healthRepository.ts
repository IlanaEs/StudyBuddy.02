export function readHealthStatus() {
  return {
    status: 'ok',
    service: 'studybuddy-backend',
    version: '0.1.0',
  } as const;
}
