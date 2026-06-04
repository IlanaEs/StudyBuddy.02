// The single gate for "can this teacher accept new students / booking requests".
// Pure + reusable: the Inbox accept buttons read it, the Kill Switch (Settings)
// flips one of its inputs, and the T1 pending-verification banner will adopt the
// same function — so there is exactly ONE definition of the rule.
import type { TeacherConfig } from '../types/teacherDashboard.types';

/** Verified AND not frozen. A null config (not loaded yet) cannot accept. */
export function canAcceptStudents(config: TeacherConfig | null): boolean {
  return !!config && config.isVerified && !config.isFrozen;
}
