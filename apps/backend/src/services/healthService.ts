import { readHealthStatus } from '../repositories/healthRepository.js';

export function getHealthStatus() {
  return readHealthStatus();
}
